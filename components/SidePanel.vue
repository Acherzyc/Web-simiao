<template>
  <div 
    class="side-panel" 
    :class="{ collapsed: isPanelCollapsed, 'is-open': isMobilePanelOpen }"
    :style="mobilePanelStyle"
    ref="sidePanelRef"
  >
    <div class="panel-toggle" @click="$emit('toggleDesktopPanel')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" :style="{ transform: isPanelCollapsed ? 'rotate(180deg)' : 'rotate(0)' }"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    
    <div 
      class="panel-grabber"
      @touchstart.passive="handleTouchStart"
      @touchmove.passive="handleTouchMove"
      @touchend="handleTouchEnd"
    ></div>

    <div class="panel-header">
      <div class="panel-header-top-row">
        <div class="header-left">
          <button v-if="selectedFeatureId" class="back-btn" @click="clearSelection" title="返回图层列表">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div class="panel-title">
            <span v-if="!selectedFeatureId">图层管理</span>
            <span v-else>要素详情</span>
          </div>
        </div>
        
        <button class="panel-close-btn-mobile" title="关闭面板" @click="$emit('closeMobilePanel')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>
    
    <div class="panel-content-area">
      
      <div v-if="selectedFeatureId && feature" class="feature-inspector">
        <DataItem
          :key="feature.id"
          :data-id="feature.id"
          :feature="feature"
          :is-highlighted="true"
          :is-expanded="true"
          :readonly="readonly"
          :current-project-id="currentProjectId"
          :notes-list="featureNotes" 
          @delete-feature="$emit('featureDeleted', feature.id)"
          @zoom-to-feature="$emit('zoomToFeature', feature.id)"
          @update-style="(styleUpdates) => $emit('updateFeatureStyle', { featureId: feature.id, styleUpdates })"
          @save-properties="(payload) => $emit('saveFeatureProperties', { featureId: feature.id, ...payload })"
        />
      </div>

      <div v-else class="layer-toc-wrapper">
        <LayerManager />
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import DataItem from './DataItem.vue';
import LayerManager from './LayerManager.vue';
import { useMapStore } from '~/stores/mapStore';

const props = defineProps({
  // 兼容旧 Props，虽然现在主要靠 Store，但为了不破坏 index.vue 的传参，保留接收
  features: Array,
  selectedFeatureId: String,
  multiSelectedIds: Array,
  isPanelCollapsed: Boolean,
  isMobilePanelOpen: Boolean,
  readonly: Boolean,
  currentProjectId: [String, Number],
  featureNotes: Array
});

const emit = defineEmits([
  'toggleDesktopPanel', 'closeMobilePanel', 'featureSelected', 'featureDeleted',
  'zoomToFeature', 'updateFeatureStyle', 'saveFeatureProperties'
]);

const mapStore = useMapStore();

// 从 Store 获取当前选中的完整要素对象
const feature = computed(() => {
  // 优先使用 Store 中的选中状态
  if (mapStore.selectedFeatureId) {
    return mapStore.selectedFeature;
  }
  // 降级兼容 props (如果是外部传入的)
  if (props.selectedFeatureId && props.features) {
    return props.features.find(f => f.id === props.selectedFeatureId);
  }
  return null;
});

function clearSelection() {
  mapStore.selectedFeatureId = null;
  emit('featureSelected', null);
}

// --- 移动端拖拽逻辑 (保持不变) ---
const isDragging = ref(false);
const startY = ref(0);
const startHeight = ref(0);
const panelHeight = ref(66);
const sidePanelRef = ref(null);

const mobilePanelStyle = computed(() => {
  if (typeof window === 'undefined' || window.innerWidth > 768) return null;
  return {
    height: `${panelHeight.value}vh`,
    transition: isDragging.value ? 'none' : 'height 0.3s ease',
  };
});

function handleTouchStart(e) {
  if (window.innerWidth > 768 || props.readonly) return;
  isDragging.value = true;
  startY.value = e.touches[0].clientY;
  startHeight.value = sidePanelRef.value.offsetHeight;
}

function handleTouchMove(e) {
  if (!isDragging.value || window.innerWidth > 768 || props.readonly) return;
  const currentY = e.touches[0].clientY;
  const deltaY = startY.value - currentY;
  const newHeight = startHeight.value + deltaY;
  const newVh = (newHeight / window.innerHeight) * 100;
  panelHeight.value = Math.max(20, Math.min(90, newVh));
}

function handleTouchEnd() {
  if (!isDragging.value || props.readonly) return;
  isDragging.value = false;
  if (panelHeight.value < 40) {
    emit('closeMobilePanel');
    panelHeight.value = 66;
  } else {
    panelHeight.value = 66;
  }
}
</script>

<style scoped>
/* 复用 main.css 中的基础样式，这里增加特定布局 */
.panel-content-area {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}
.back-btn:hover { background: #eee; color: #333; }

.layer-toc-wrapper {
  flex: 1;
  overflow: hidden;
}

.feature-inspector {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f9f9f9;
}
</style>