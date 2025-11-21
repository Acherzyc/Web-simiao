<template>
  <div class="analysis-panel">
    <div class="panel-header">
      <h3>分析工具箱</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>

    <div class="tools-list">
      <div class="tool-item">
        <div class="tool-title" @click="activeTool = activeTool === 'buffer' ? null : 'buffer'">
          <span class="icon">⭕</span> 缓冲区分析 (Buffer)
          <span class="arrow">{{ activeTool === 'buffer' ? '▲' : '▼' }}</span>
        </div>
        <div v-if="activeTool === 'buffer'" class="tool-content">
          <div class="form-item">
            <label>选择图层</label>
            <select v-model="bufferConfig.layerId">
              <option v-for="l in layers" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
          </div>
          <div class="form-item">
            <label>缓冲距离 (km)</label>
            <input type="number" v-model.number="bufferConfig.distance" step="0.1">
          </div>
          <button class="run-btn" @click="runBuffer">运行分析</button>
        </div>
      </div>

      <div class="tool-item">
        <div class="tool-title" @click="activeTool = activeTool === 'grid' ? null : 'grid'">
          <span class="icon">📊</span> 房价热力网格 (Fishnet)
          <span class="arrow">{{ activeTool === 'grid' ? '▲' : '▼' }}</span>
        </div>
        <div v-if="activeTool === 'grid'" class="tool-content">
           <div class="form-item">
            <label>楼盘点图层</label>
            <select v-model="gridConfig.layerId">
              <option v-for="l in pointLayers" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
          </div>
          <div class="form-item">
            <label>价格字段</label>
            <select v-model="gridConfig.field">
              <option v-for="f in getFields(gridConfig.layerId)" :key="f" :value="f">{{ f }}</option>
            </select>
          </div>
          <button class="run-btn" @click="runGrid">生成价格分布图</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useMapStore } from '~/stores/mapStore';

const emit = defineEmits(['close']);
const mapStore = useMapStore();

const activeTool = ref(null);
const bufferConfig = ref({ layerId: '', distance: 1 });
const gridConfig = ref({ layerId: '', field: 'price' });

const layers = computed(() => mapStore.layers);
const pointLayers = computed(() => mapStore.layers.filter(l => l.type === 'point'));

function getFields(layerId) {
  const layer = layers.value.find(l => l.id === layerId);
  return layer?.features.length ? Object.keys(layer.features[0].properties) : [];
}

function runBuffer() {
  if (!bufferConfig.value.layerId) return alert('请选择图层');
  try {
    mapStore.runBufferAnalysis(bufferConfig.value.layerId, bufferConfig.value.distance);
    alert('分析完成！已添加新图层');
  } catch (e) { alert(e.message); }
}

function runGrid() {
  if (!gridConfig.value.layerId) return alert('请选择图层');
  try {
    mapStore.runGridAnalysis(gridConfig.value.layerId, gridConfig.value.field);
    alert('分析完成！已生成网格图');
  } catch (e) { alert(e.message); }
}
</script>

<style scoped>
.analysis-panel {
  display: flex; flex-direction: column; height: 100%; background: white; border-left: 1px solid #e5e7eb;
}
.panel-header {
  padding: 14px 16px; background: #f0fdf4; border-bottom: 1px solid #dcfce7; color: #166534;
  display: flex; justify-content: space-between;
}
.panel-header h3 { margin: 0; font-size: 14px; }
.close-btn { border: none; background: none; cursor: pointer; font-size: 18px; color: #166534; }

.tools-list { padding: 16px; }
.tool-item { border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
.tool-title {
  padding: 10px 12px; background: #f9fafb; cursor: pointer; font-size: 13px; font-weight: 500; color: #374151;
  display: flex; align-items: center;
}
.tool-title .icon { margin-right: 8px; }
.tool-title .arrow { margin-left: auto; color: #9ca3af; font-size: 10px; }
.tool-title:hover { background: #f3f4f6; }

.tool-content { padding: 12px; border-top: 1px solid #e5e7eb; background: white; }
.form-item { margin-bottom: 12px; }
.form-item label { display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px; }
.form-item select, .form-item input {
  width: 100%; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;
}

.run-btn {
  width: 100%; padding: 8px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;
}
.run-btn:hover { background: #15803d; }
</style>