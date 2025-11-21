<template>
  <div class="style-editor" v-if="layer">
    <div class="editor-header">
      <h3>样式与标注 - {{ layer.name }}</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    
    <div class="editor-body">
      <div class="section">
        <h4 class="section-title">符号样式</h4>
        <div class="control-grid">
          <template v-if="layer.type === 'point'">
            <label>填充颜色</label> <input type="color" v-model="style.fillColor" @change="update">
            <label>边框颜色</label> <input type="color" v-model="style.borderColor" @change="update">
            <label>大小 (px)</label> <input type="number" v-model.number="style.size" @change="update">
          </template>
          
          <template v-if="layer.type === 'polyline'">
            <label>线条颜色</label> <input type="color" v-model="style.color" @change="update">
            <label>线宽</label> <input type="number" v-model.number="style.weight" @change="update">
            <label>线型</label> 
            <select v-model="style.style" @change="update">
              <option value="solid">实线</option>
              <option value="dashed">虚线</option>
            </select>
          </template>

          <template v-if="layer.type === 'polygon'">
            <label>填充颜色</label> <input type="color" v-model="style.fillColor" @change="update">
            <label>不透明度</label> <input type="range" min="0" max="1" step="0.1" v-model.number="style.fillOpacity" @change="update">
            <label>边框颜色</label> <input type="color" v-model="style.strokeColor" @change="update">
            <label>边框宽度</label> <input type="number" v-model.number="style.strokeWeight" @change="update">
          </template>
        </div>
      </div>

      <div class="section">
        <h4 class="section-title">标注 (Label)</h4>
        <div class="control-row checkbox-row">
          <input type="checkbox" id="show-label" v-model="style.label.show" @change="update">
          <label for="show-label">启用标注</label>
        </div>

        <div v-if="style.label.show" class="control-grid">
          <label>标注字段</label>
          <select v-model="style.label.field" @change="update">
            <option v-for="field in fieldNames" :key="field" :value="field">{{ field }}</option>
          </select>

          <label>字体颜色</label> <input type="color" v-model="style.label.color" @change="update">
          <label>字号</label> <input type="number" v-model.number="style.label.fontSize" @change="update">
          
          <label>避让策略</label>
          <select v-model="style.label.collision" @change="update">
            <option :value="true">自动避让 (推荐)</option>
            <option :value="false">全部显示 (可能重叠)</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useMapStore } from '~/stores/mapStore';

const props = defineProps({ layerId: String });
const emit = defineEmits(['close']);
const mapStore = useMapStore();

const layer = computed(() => mapStore.layers.find(l => l.id === props.layerId));
const fieldNames = computed(() => {
  if (!layer.value?.features?.length) return ['name'];
  return Object.keys(layer.value.features[0].properties);
});

// 本地深拷贝样式对象，防止直接修改 Store
const style = ref({ label: {} });

watch(layer, (newLayer) => {
  if (newLayer) {
    style.value = JSON.parse(JSON.stringify(newLayer.style || {}));
    if (!style.value.label) style.value.label = { show: false, field: 'name', color: '#000', fontSize: 12 };
  }
}, { immediate: true });

function update() {
  mapStore.updateLayerStyle(props.layerId, style.value);
}
</script>

<style scoped>
.style-editor {
  display: flex; flex-direction: column; height: 100%; background: white;
  border-left: 1px solid #e5e7eb;
}
.editor-header {
  padding: 12px 16px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between;
  background: #f9fafb;
}
.editor-header h3 { font-size: 14px; font-weight: 600; margin: 0; }
.close-btn { border: none; background: none; font-size: 20px; color: #999; cursor: pointer; }

.editor-body { padding: 16px; flex: 1; overflow-y: auto; }

.section { margin-bottom: 24px; }
.section-title {
  font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase;
  border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 12px;
}

.control-grid {
  display: grid; grid-template-columns: 80px 1fr; gap: 8px 12px; align-items: center;
}
.control-grid label { font-size: 12px; color: #6b7280; text-align: right; }
.control-grid input, .control-grid select {
  width: 100%; padding: 4px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 12px;
}

.checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.checkbox-row label { font-size: 13px; color: #111; font-weight: 500; cursor: pointer; }
</style>