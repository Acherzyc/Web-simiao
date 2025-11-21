<template>
  <div v-if="isVisible" class="modal-backdrop" @click.self="handleClose">
    <div class="modal-card">
      <div class="modal-header">
        <h3>导入空间数据</h3>
        <button class="close-btn" @click="handleClose">×</button>
      </div>
      
      <div class="modal-body">
        <div 
          class="drop-zone" 
          :class="{ dragging: isDragging }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
        >
          <div v-if="!file" class="upload-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p>拖拽文件到此处，或点击选择</p>
            <span class="sub-text">支持 .zip (Shapefile), .geojson, .json, .csv, .xlsx</span>
            <input type="file" ref="fileInput" @change="handleFileSelect" accept=".zip,.geojson,.json,.csv,.xlsx,.xls" hidden>
            <button class="btn-select" @click="$refs.fileInput.click()">选择文件</button>
          </div>
          
          <div v-else class="file-preview">
            <div class="file-icon">📄</div>
            <div class="file-info">
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatSize(file.size) }}</span>
            </div>
            <button class="btn-remove" @click="file = null">更换</button>
          </div>
        </div>

        <div class="form-group" v-if="file">
          <label>源数据坐标系 <span class="required">*</span></label>
          <div class="crs-select-wrapper">
            <select v-model="sourceCRS" class="crs-select">
              <option value="WGS84">WGS 84 (GPS / GeoJSON 标准)</option>
              <option value="CGCS2000">CGCS 2000 (国家大地坐标系)</option>
              <option value="BD09">BD 09 (百度坐标)</option>
              <option value="GCJ02">GCJ 02 (高德/腾讯 - 无需转换)</option>
            </select>
            <div class="crs-help">
              ⚠️ 选错坐标系会导致数据偏移。Shapefile 通常是 WGS84 或 CGCS2000。
            </div>
          </div>
        </div>

        <div v-if="isProcessing" class="progress-bar">
          <div class="progress-fill"></div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" @click="handleClose">取消</button>
        <button class="btn-primary" @click="processImport" :disabled="!file || isProcessing">
          {{ isProcessing ? '处理中...' : '开始导入' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import * as shp from 'shpjs';
import { useMapStore } from '~/stores/mapStore';
/* global XLSX */

const props = defineProps({ isVisible: Boolean });
const emit = defineEmits(['close', 'import-success']);
const mapStore = useMapStore();

const file = ref(null);
const sourceCRS = ref('WGS84');
const isDragging = ref(false);
const isProcessing = ref(false);

function handleClose() {
  file.value = null;
  isProcessing.value = false;
  emit('close');
}

function handleDrop(e) {
  isDragging.value = false;
  const droppedFile = e.dataTransfer.files[0];
  if (droppedFile) file.value = droppedFile;
}

function handleFileSelect(e) {
  if (e.target.files.length > 0) {
    file.value = e.target.files[0];
  }
}

async function processImport() {
  if (!file.value) return;
  isProcessing.value = true;

  try {
    const fileName = file.value.name;
    let rawFeatures = [];

    // 1. 解析文件
    if (fileName.endsWith('.zip')) {
      const buffer = await file.value.arrayBuffer();
      const result = await shp.parseZip(buffer);
      const geojson = Array.isArray(result) ? result[0] : result;
      rawFeatures = geojson.features;
    } 
    else if (fileName.endsWith('.json') || fileName.endsWith('.geojson')) {
      const text = await file.value.text();
      const json = JSON.parse(text);
      rawFeatures = json.features || (Array.isArray(json) ? json : []);
    }
    else if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
       if (typeof XLSX === 'undefined') throw new Error("XLSX library not loaded");
       const buffer = await file.value.arrayBuffer();
       const workbook = XLSX.read(buffer, { type: 'array' });
       const sheet = workbook.Sheets[workbook.SheetNames[0]];
       const json = XLSX.utils.sheet_to_json(sheet);
       
       rawFeatures = json.map((row, i) => {
         const keys = Object.keys(row);
         const lngKey = keys.find(k => /lng|lon|经度/i.test(k));
         const latKey = keys.find(k => /lat|纬度/i.test(k));
         
         if (lngKey && latKey) {
           return {
             type: "Feature",
             id: i,
             properties: row,
             geometry: {
               type: "Point",
               coordinates: [parseFloat(row[lngKey]), parseFloat(row[latKey])]
             }
           }
         }
         return null;
       }).filter(f => f !== null);
    }

    if (!rawFeatures || rawFeatures.length === 0) {
      throw new Error("未能在文件中找到有效的地理要素。");
    }

    // 2. 坐标转换
    const convertedFeatures = mapStore.transformGeoJSON({ features: rawFeatures }, sourceCRS.value);

    // 3. 判断图层类型
    const firstGeomType = convertedFeatures[0]?.geometry?.type;
    let layerType = 'point';
    if (firstGeomType?.includes('Line')) layerType = 'polyline';
    if (firstGeomType?.includes('Polygon')) layerType = 'polygon';

    // 4. 添加到 Store
    mapStore.addLayer(fileName.split('.')[0], layerType, convertedFeatures);

    emit('import-success');
    handleClose();
    
  } catch (error) {
    console.error(error);
    alert(`导入失败: ${error.message}`);
  } finally {
    isProcessing.value = false;
  }
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; justify-content: center; align-items: center; z-index: 2000;
  backdrop-filter: blur(4px);
}
.modal-card {
  background: white; width: 480px; max-width: 90vw; border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden; animation: modalSlideIn 0.3s ease-out;
}
.modal-header {
  padding: 16px 24px; border-bottom: 1px solid #eee;
  display: flex; justify-content: space-between; align-items: center;
}
.modal-header h3 { font-size: 18px; font-weight: 600; color: #333; margin: 0; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; }
.close-btn:hover { color: #333; }

.modal-body { padding: 24px; }

.drop-zone {
  border: 2px dashed #e2e8f0; border-radius: 8px; padding: 32px;
  text-align: center; transition: all 0.2s; background: #f8fafc;
}
.drop-zone.dragging { border-color: #3b82f6; background: #eff6ff; }
.upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #64748b; }
.sub-text { font-size: 12px; color: #94a3b8; margin-bottom: 12px; }
.btn-select {
  padding: 8px 16px; background: white; border: 1px solid #cbd5e1;
  border-radius: 6px; color: #475569; cursor: pointer; font-weight: 500;
  transition: all 0.2s;
}
.btn-select:hover { border-color: #3b82f6; color: #3b82f6; }

.file-preview {
  display: flex; align-items: center; gap: 12px; padding: 8px;
  background: white; border: 1px solid #e2e8f0; border-radius: 6px;
}
.file-icon { font-size: 24px; }
.file-info { flex: 1; text-align: left; display: flex; flex-direction: column; }
.file-name { font-weight: 500; color: #333; font-size: 14px; }
.file-size { font-size: 12px; color: #999; }
.btn-remove { font-size: 12px; color: #ef4444; background: none; border: none; cursor: pointer; }

.form-group { margin-top: 20px; }
.form-group label { display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 8px; }
.required { color: #ef4444; }
.crs-select {
  width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;
  background: white; font-size: 14px;
}
.crs-help { font-size: 12px; color: #f59e0b; margin-top: 6px; display: flex; align-items: center; gap: 4px; }

.progress-bar {
  height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 24px; overflow: hidden;
}
.progress-fill {
  height: 100%; background: #3b82f6; width: 50%;
  animation: progressIndeterminate 1s infinite linear;
}

.modal-footer {
  padding: 16px 24px; background: #f8fafc; border-top: 1px solid #eee;
  display: flex; justify-content: flex-end; gap: 12px;
}
.btn-cancel { padding: 8px 16px; border: 1px solid #cbd5e1; background: white; border-radius: 6px; cursor: pointer; }
.btn-primary { padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; }
.btn-primary:disabled { background: #94a3b8; cursor: not-allowed; }

@keyframes modalSlideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes progressIndeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
</style>