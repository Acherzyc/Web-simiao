<template>
  <div class="gis-container">
    <AppHeader 
      :current-tool="currentTool"
      @set-tool="setTool"
      @open-import-modal="isImportModalVisible = true"
      @open-analysis="mapStore.openPanel('analysis')"
      @open-cloud-panel="isCloudPanelVisible = true"
      @clear-all="clearAll"
      @generate-share-link="shareToCloud"
      @save-image="exportAsImage"
      @toggle-map-style="toggleMapStyle"
    />

    <div class="workspace">
      <div class="pane-left">
        <LayerManager @zoom-to-layer="zoomToLayer" />
      </div>

      <div class="pane-center">
        <div id="map" class="map-view" :class="{ 'drawing-mode': isDrawing }"></div>
        
        <transition name="slide-up">
          <AttributeTable 
            v-if="mapStore.isTableVisible" 
            @close="mapStore.isTableVisible = false"
            @zoom-to-feature="zoomToFeature"
          />
        </transition>
        
        <div class="drawing-tip" v-if="isDrawing">
          正在绘制: {{ toolTip }} (双击结束)
          <button @click="cancelDrawing">取消</button>
        </div>
      </div>

      <transition name="slide-right">
        <div class="pane-right" v-if="mapStore.activePanel || mapStore.selectedFeatureId">
          <FeatureInspector 
            v-if="mapStore.selectedFeatureId && !mapStore.activePanel"
            @close="mapStore.selectFeature(null)"
            @zoom="zoomToSelected"
          />
          <StyleEditor 
            v-else-if="mapStore.activePanel === 'style'"
            :layer-id="mapStore.activeLayerId"
            @close="mapStore.closePanel()"
          />
          <AnalysisPanel 
            v-else-if="mapStore.activePanel === 'analysis'"
            @close="mapStore.closePanel()"
          />
        </div>
      </transition>
    </div>

    <ImportDataModal :is-visible="isImportModalVisible" @close="isImportModalVisible = false" @import-success="handleImportSuccess" />
    <CloudSyncPanel ref="cloudPanelRef" :is-visible="isCloudPanelVisible" @close="isCloudPanelVisible = false" @save-project="handleSaveProject" @load-project="handleLoadProject" />
    <ToastNotification :message="toast.message" :type="toast.type" :is-visible="toast.visible" />
    <LoadingIndicator :is-visible="isLoading" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useSupabaseClient, useSupabaseUser } from '#imports';
import { useMapStore } from '~/stores/mapStore';
import AppHeader from '~/components/AppHeader.vue';
import LayerManager from '~/components/LayerManager.vue';
import AttributeTable from '~/components/AttributeTable.vue';
import FeatureInspector from '~/components/FeatureInspector.vue';
import StyleEditor from '~/components/StyleEditor.vue';
import AnalysisPanel from '~/components/AnalysisPanel.vue';
import ImportDataModal from '~/components/ImportDataModal.vue';
import CloudSyncPanel from '~/components/CloudSyncPanel.vue';
import ToastNotification from '~/components/ToastNotification.vue';
import LoadingIndicator from '~/components/LoadingIndicator.vue';
/* global AMap, html2canvas */

const mapStore = useMapStore();
const supabase = useSupabaseClient();
const user = useSupabaseUser();

const map = ref(null);
const isImportModalVisible = ref(false);
const isCloudPanelVisible = ref(false);
const currentTool = ref('select');
const isDrawing = ref(false);
const isLoading = ref(false);
const toast = reactive({ message: '', type: 'info', visible: false });
const cloudPanelRef = ref(null);

let drawingLayer = null;
let labelLayer = null;
let satelliteLayer = null;
let mouseTool = null;
let labelMarkers = new Map();

// --- 地图初始化与渲染 ---
const allFeatures = computed(() => mapStore.allVisibleFeatures);

watch(allFeatures, (newFeatures) => {
  if (!drawingLayer) return;
  
  drawingLayer.clearOverlays();
  labelLayer.clearOverlays();
  labelMarkers.clear();

  newFeatures.forEach(f => renderFeature(f));
}, { deep: true });

onMounted(() => {
  const checkAMap = setInterval(() => {
    if (window.AMap && typeof window.AMap.Map === 'function') {
      clearInterval(checkAMap);
      initMap();
    }
  }, 100);
});

function initMap() {
  map.value = new AMap.Map('map', {
    zoom: 12, center: [113.323587, 23.106573], viewMode: '2D',
    mapStyle: 'amap://styles/1b8bbb3ab585491ce8bee8fd90f016f9',
    WebGLParams: { preserveDrawingBuffer: true }
  });

  map.value.on('complete', () => {
    satelliteLayer = new AMap.TileLayer.Satellite();
    map.value.add(satelliteLayer);
    satelliteLayer.hide();

    drawingLayer = new AMap.OverlayGroup();
    labelLayer = new AMap.OverlayGroup();
    map.value.add([drawingLayer, labelLayer]);
    
    map.value.plugin(['AMap.MouseTool', 'AMap.Scale'], () => {
        mouseTool = new AMap.MouseTool(map.value);
        mouseTool.on('draw', handleDrawComplete);
        map.value.addControl(new AMap.Scale());
    });

    map.value.on('click', (e) => {
      if(currentTool.value === 'select' && e.target.CLASS_NAME === 'AMap.Map') {
        mapStore.selectFeature(null);
        mapStore.closePanel();
      }
    });
  });
}

function renderFeature(f) {
  const style = f.style || {};
  const extData = { id: f.id };
  let overlay;

  // 1. 几何渲染
  if (f.type === 'point') {
    overlay = new AMap.CircleMarker({
      center: f.geometry.coordinates, radius: style.size / 2,
      fillColor: style.fillColor, fillOpacity: style.opacity,
      strokeColor: style.borderColor, strokeWeight: 1,
      extData, clickable: true, zIndex: 100, cursor: 'pointer'
    });
  } else if (f.type === 'polyline') {
    overlay = new AMap.Polyline({
      path: f.geometry.coordinates, extData, clickable: true, zIndex: 50,
      strokeColor: style.color, strokeWeight: style.weight, strokeOpacity: style.opacity,
      strokeStyle: style.style || 'solid'
    });
  } else if (f.type === 'polygon') {
    overlay = new AMap.Polygon({
      path: f.geometry.coordinates, extData, clickable: true, zIndex: 10,
      fillColor: style.fillColor, fillOpacity: style.fillOpacity,
      strokeColor: style.strokeColor, strokeWeight: style.strokeWeight
    });
  }

  if (overlay) {
    overlay.on('click', () => {
       if (currentTool.value === 'select') mapStore.selectFeature(f.id);
    });
    drawingLayer.addOverlay(overlay);
  }

  // 2. 标注渲染 (LabelMarker)
  if (style.label?.show && f.properties[style.label.field]) {
    let position;
    if (f.type === 'point') position = f.geometry.coordinates;
    else if (f.type === 'polygon' && overlay) position = overlay.getBounds().getCenter();
    
    if (position) {
      const labelText = String(f.properties[style.label.field]);
      const labelMarker = new AMap.LabelMarker({
        position: position,
        text: {
          content: labelText,
          direction: 'top',
          style: { fontSize: style.label.fontSize, fillColor: style.label.color, strokeColor: '#fff', strokeWidth: 2 }
        },
        zIndex: 200,
        extData
      });
      // 如果配置了自动避让（AMap默认行为更复杂，这里简单启用）
      if (style.label.collision) {
         // 高德 LabelMarker 默认会进行一定的避让
      }
      labelLayer.addOverlay(labelMarker);
    }
  }
}

// --- 绘图工具逻辑 ---
const toolTip = computed(() => {
    const map = { point: '点', polyline: '线段', polygon: '多边形' };
    return map[currentTool.value] || '';
});

function setTool(tool) {
    currentTool.value = tool;
    isDrawing.value = ['point','polyline','polygon'].includes(tool);
    
    if (mouseTool) mouseTool.close(true); // 清除之前的临时绘制
    
    if (isDrawing) {
        mapStore.selectFeature(null); // 绘图时取消选中
        if(tool === 'point') mouseTool.marker();
        else if(tool === 'polyline') mouseTool.polyline();
        else if(tool === 'polygon') mouseTool.polygon();
    }
}

function handleDrawComplete(e) {
    const type = currentTool.value;
    const obj = e.obj;
    
    // 提取坐标转为 GeoJSON
    let coordinates;
    let geomType;
    
    if (type === 'point') {
        const pos = obj.getPosition();
        coordinates = [pos.lng, pos.lat];
        geomType = 'Point';
    } else {
        const path = obj.getPath();
        coordinates = path.map(p => [p.lng, p.lat]);
        geomType = type === 'polyline' ? 'LineString' : 'Polygon';
        if (geomType === 'Polygon') coordinates = [coordinates]; // 面要素需要嵌套数组
    }
    
    // 获取或创建“我的绘制”图层
    let drawLayer = mapStore.layers.find(l => l.id === 'user_draw_layer');
    if (!drawLayer) {
        drawLayer = mapStore.addLayer('我的绘制', 'mixed'); // mixed 类型允许混合，但在addLayer里我们会分别处理
        drawLayer.id = 'user_draw_layer';
    }
    
    const newFeature = {
        type: 'Feature',
        geometry: { type: geomType, coordinates },
        properties: { name: `要素 ${drawLayer.features.length + 1}`, created: new Date().toLocaleString() }
    };

    // 手动添加到 features 数组 (Pinia 会响应)
    // 为了保证样式正确，最好重新调用 addLayer 的部分逻辑，或者简单 push
    // 这里我们简单 push，并手动补全 id
    newFeature.id = `draw_${Date.now()}`;
    drawLayer.features.push(newFeature);

    // 清理地图上的临时对象，交给 Store 统一渲染
    mouseTool.close(false);
    map.value.remove(obj);
    
    showToast('绘制成功', 'success');
    // 保持工具激活，允许连续绘制
    setTool(type);
}

function cancelDrawing() {
    if(mouseTool) mouseTool.close(true);
    isDrawing.value = false;
    currentTool.value = 'select';
}

// --- 其他功能实现 ---

async function shareToCloud() {
  if (!user.value) return showToast('请先登录才能分享', 'warning');
  if (mapStore.layers.length === 0) return showToast('没有数据可分享', 'warning');
  
  isLoading.value = true;
  try {
    // 序列化整个 Store 的 Layers
    const mapData = { 
        layers: mapStore.layers.map(l => ({
            ...l,
            features: l.features // 此时 features 已经是纯数据，没有 graphic 对象
        })),
        view: { center: map.value.getCenter(), zoom: map.value.getZoom() }
    };

    const { data, error } = await supabase
        .from('shared_maps')
        .insert({ map_data: mapData, user_email: user.value.email })
        .select('id')
        .single();

    if (error) throw error;
    
    const link = `${window.location.origin}/share/${data.id}`;
    await navigator.clipboard.writeText(link);
    showToast('分享链接已复制到剪贴板！', 'success');
  } catch (e) {
    showToast(`分享失败: ${e.message}`, 'error');
  } finally {
    isLoading.value = false;
  }
}

async function exportAsImage() {
    isLoading.value = true;
    // 隐藏 UI 元素
    const uiElements = document.querySelectorAll('.header, .pane-left, .pane-right, .attribute-table-panel, .amap-control');
    uiElements.forEach(el => el.style.visibility = 'hidden');
    
    try {
        await new Promise(r => setTimeout(r, 500)); // 等待地图渲染稳定
        const canvas = await html2canvas(document.querySelector('#map'), { useCORS: true, ignoreElements: el => el.classList.contains('drawing-tip') });
        const link = document.createElement('a');
        link.download = `SuperMap_Export_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        showToast('截图已下载', 'success');
    } catch (e) {
        showToast('截图失败', 'error');
    } finally {
        uiElements.forEach(el => el.style.visibility = '');
        isLoading.value = false;
    }
}

// --- 云端项目保存/读取 ---
async function handleSaveProject(payload) {
    if (!user.value) return showToast('请先登录', 'error');
    const projectData = { 
        user_id: user.value.id, 
        project_name: payload.name,
        map_data: { layers: mapStore.layers } 
    };
    
    try {
        const query = payload.id 
            ? supabase.from('projects').update({ map_data: projectData.map_data }).eq('id', payload.id)
            : supabase.from('projects').insert(projectData);
        const { error } = await query;
        if (error) throw error;
        showToast('保存成功', 'success');
        cloudPanelRef.value?.onSaveComplete();
    } catch (e) { showToast(e.message, 'error'); }
}

async function handleLoadProject(id) {
    isLoading.value = true;
    try {
        const { data, error } = await supabase.from('projects').select('map_data').eq('id', id).single();
        if (error) throw error;
        clearAll(false); // 不确认直接清空
        currentProjectId.value = id;
        if (data.map_data?.layers) {
            mapStore.layers = data.map_data.layers;
            // 重新生成内部ID计数器，防止ID冲突
            // 实际应用中可能需要更复杂的ID管理
        }
        showToast('加载成功', 'success');
        setTimeout(() => map.value.setFitView(), 500);
    } catch (e) { showToast(e.message, 'error'); }
    finally { isLoading.value = false; isCloudPanelVisible.value = false; }
}

function clearAll(confirmUser = true) {
    if (confirmUser && !confirm('确定要清空所有图层吗？')) return;
    mapStore.layers = [];
    mapStore.selectFeature(null);
    mapStore.closePanel();
    showToast('地图已清空');
}

function handleImportSuccess() { 
    showToast('导入成功', 'success');
    map.value.setFitView(); 
}
function zoomToLayer() { map.value.setFitView(); }
function zoomToFeature(id) { 
    const f = mapStore.selectedFeature; 
    if(f && f.geometry.type === 'Point') map.value.setZoomAndCenter(17, f.geometry.coordinates);
}
function zoomToSelected() { if(mapStore.selectedFeatureId) zoomToFeature(mapStore.selectedFeatureId); }
function toggleMapStyle() { 
    if(satelliteLayer) satelliteLayer.getVisible() ? satelliteLayer.hide() : satelliteLayer.show(); 
}
function showToast(msg, type='info') {
    toast.message = msg; toast.type = type; toast.visible = true;
    setTimeout(() => toast.visible = false, 3000);
}
</script>

<style scoped>
.gis-container { display: flex; flex-direction: column; height: 100vh; width: 100vw; }
.workspace { flex: 1; display: flex; overflow: hidden; position: relative; }
.pane-left { width: 260px; border-right: 1px solid #ddd; background: #f9fafb; z-index: 20; display: flex; flex-direction: column; }
.pane-center { flex: 1; position: relative; display: flex; flex-direction: column; }
.map-view { flex: 1; width: 100%; height: 100%; }
.pane-right { width: 300px; border-left: 1px solid #ddd; background: white; z-index: 30; box-shadow: -2px 0 10px rgba(0,0,0,0.05); }
.drawing-tip {
  position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px;
  font-size: 14px; pointer-events: auto; display: flex; gap: 10px; align-items: center;
}
.drawing-tip button { background: white; color: black; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
#map.drawing-mode { cursor: crosshair; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.3s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(100%); }
</style>