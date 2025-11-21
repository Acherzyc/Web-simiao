<template>
  <div class="feature-inspector" v-if="feature">
    <div class="inspector-header">
      <div class="title-group">
        <div class="icon-wrapper" :class="feature.type">
          <svg v-if="feature.type==='point'" viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="6" fill="currentColor"/></svg>
          <svg v-else-if="feature.type==='polyline'" viewBox="0 0 24 24" width="16" height="16"><path d="M3 12l6-6 6 12 6-6" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          <svg v-else viewBox="0 0 24 24" width="16" height="16"><rect x="4" y="4" width="16" height="16" fill="currentColor" opacity="0.5" stroke="currentColor" stroke-width="2"/></svg>
        </div>
        <span class="title">要素属性</span>
      </div>
      <button class="close-btn" @click="$emit('close')" title="关闭面板">×</button>
    </div>

    <div class="inspector-content">
      <div class="quick-actions">
        <button class="action-btn" @click="$emit('zoom')" title="缩放至">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          定位
        </button>
        <button class="action-btn delete" @click="deleteFeature" title="删除要素">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          删除
        </button>
      </div>

      <div class="props-group">
        <div class="group-header">基本信息</div>
        
        <div v-for="(value, key) in feature.properties" :key="key" class="field-row">
          <label class="field-label" :title="key">{{ key }}</label>
          <div class="field-input-wrapper">
            <input 
              type="text" 
              class="field-input"
              :value="value" 
              @change="e => updateProp(key, e.target.value)"
            >
          </div>
        </div>
        
        <div class="add-prop-row">
          <button class="add-prop-btn" @click="addProperty">+ 添加新字段</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMapStore } from '~/stores/mapStore';

const mapStore = useMapStore();
const emit = defineEmits(['close', 'zoom']);

// 从 Store 获取选中的要素
const feature = computed(() => mapStore.selectedFeature);

function updateProp(key, value) {
  if (feature.value) {
    mapStore.updateFeatureProperties(feature.value.id, { [key]: value });
  }
}

function deleteFeature() {
  if(!feature.value) return;
  if(confirm('确定要删除这个要素吗？')) {
    const layerId = feature.value.layerId;
    const layer = mapStore.layers.find(l => l.id === layerId);
    if (layer) {
        layer.features = layer.features.filter(f => f.id !== feature.value.id);
        mapStore.selectFeature(null); // 取消选中
    }
  }
}

function addProperty() {
  const key = prompt("请输入新字段名称:");
  if (key && feature.value) {
    mapStore.updateFeatureProperties(feature.value.id, { [key]: "" });
  }
}
</script>

<style scoped>
.feature-inspector {
  display: flex; flex-direction: column; height: 100%; background: white;
  border-left: 1px solid #e5e7eb; box-shadow: -2px 0 8px rgba(0,0,0,0.05);
}

.inspector-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;
}
.title-group { display: flex; align-items: center; gap: 8px; }
.icon-wrapper { color: #6b7280; display: flex; }
.icon-wrapper.point { color: #ef4444; }
.icon-wrapper.polyline { color: #3b82f6; }
.icon-wrapper.polygon { color: #10b981; }
.title { font-weight: 600; font-size: 14px; color: #111827; }
.close-btn { border: none; background: none; font-size: 20px; color: #9ca3af; cursor: pointer; line-height: 1; }
.close-btn:hover { color: #1f2937; }

.inspector-content { flex: 1; overflow-y: auto; padding: 16px; }

.quick-actions { display: flex; gap: 8px; margin-bottom: 20px; }
.action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px; border: 1px solid #d1d5db; background: white; border-radius: 6px;
  font-size: 13px; color: #374151; cursor: pointer; transition: all 0.2s;
}
.action-btn:hover { background: #f3f4f6; border-color: #9ca3af; }
.action-btn.delete { color: #ef4444; border-color: #fee2e2; background: #fff1f2; }
.action-btn.delete:hover { background: #fee2e2; border-color: #fecaca; }

.props-group { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
.group-header {
  background: #f3f4f6; padding: 8px 12px; font-size: 12px; font-weight: 600;
  color: #4b5563; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb;
}

.field-row {
  display: flex; align-items: center; border-bottom: 1px solid #f3f4f6;
  background: white;
}
.field-row:last-child { border-bottom: none; }

.field-label {
  width: 100px; padding: 10px 12px; font-size: 12px; color: #6b7280;
  background: #f9fafb; border-right: 1px solid #f3f4f6;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.field-input-wrapper { flex: 1; }
.field-input {
  width: 100%; border: none; padding: 10px 12px; font-size: 13px; color: #111827;
  background: transparent;
}
.field-input:focus { outline: none; background: #eff6ff; box-shadow: inset 0 0 0 2px #3b82f6; }

.add-prop-row { padding: 8px; background: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb; }
.add-prop-btn {
  background: none; border: 1px dashed #d1d5db; color: #6b7280;
  padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; width: 100%;
}
.add-prop-btn:hover { border-color: #3b82f6; color: #3b82f6; background: white; }
</style>