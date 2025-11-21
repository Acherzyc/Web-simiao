<template>
  <div class="layer-manager" @click="clearContextMenu">
    <div class="toc-header">
      <span>内容列表</span>
    </div>

    <div v-if="layers.length === 0" class="empty-layers">
      <p>暂无数据</p>
      <span class="sub-text">拖入文件或点击添加数据</span>
    </div>

    <ul class="layer-list">
      <li 
        v-for="(layer, index) in layers" 
        :key="layer.id" 
        class="layer-item"
        :class="{ active: layer.id === activeLayerId }"
        @click="setActiveLayer(layer.id)"
        @contextmenu.prevent="showContextMenu($event, layer)"
      >
        <div class="layer-visibility" @click.stop="toggleVisibility(layer.id)">
          <input type="checkbox" :checked="layer.visible" />
        </div>
        
        <div class="layer-symbology" :class="layer.type">
          <span class="symbol-preview" :style="{ background: getPreviewColor(layer) }"></span>
        </div>

        <div class="layer-content">
            <span class="layer-name">{{ layer.name }}</span>
        </div>

        <div class="drag-handle">
             <button class="mini-btn" @click.stop="moveLayer(layer.id, index, -1)" :disabled="index===0">▲</button>
             <button class="mini-btn" @click.stop="moveLayer(layer.id, index, 1)" :disabled="index===layers.length-1">▼</button>
        </div>
      </li>
    </ul>

    <div 
      v-if="contextMenu.visible" 
      class="context-menu" 
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
    >
      <div class="menu-item header">{{ contextMenu.layer?.name }}</div>
      <div class="menu-divider"></div>
      <div class="menu-item" @click="handleMenuAction('style')">🎨 编辑样式与标注</div>
      <div class="menu-item" @click="handleMenuAction('attribute')">📋 打开属性表</div>
      <div class="menu-item" @click="handleMenuAction('zoom')">🔍 缩放至图层</div>
      <div class="menu-divider"></div>
      <div class="menu-item delete" @click="handleMenuAction('remove')">🗑️ 移除</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useMapStore } from '~/stores/mapStore';

const mapStore = useMapStore();
const layers = computed(() => mapStore.layers);
const activeLayerId = computed(() => mapStore.activeLayerId);
const emit = defineEmits(['zoom-to-layer']);

const contextMenu = ref({ visible: false, x: 0, y: 0, layer: null });

function toggleVisibility(id) { mapStore.toggleLayerVisibility(id); }
function setActiveLayer(id) { mapStore.activeLayerId = id; }
function moveLayer(id, idx, dir) { mapStore.reorderLayer(id, idx + dir); }
function showContextMenu(e, layer) { contextMenu.value = { visible: true, x: e.clientX, y: e.clientY, layer }; }
function clearContextMenu() { contextMenu.value.visible = false; }
function getPreviewColor(layer) { return layer.style?.fillColor || layer.style?.color || '#ccc'; }

function handleMenuAction(action) {
  const layer = contextMenu.value.layer;
  if (!layer) return;

  if (action === 'attribute') mapStore.openAttributeTable(layer.id);
  else if (action === 'style') mapStore.openPanel('style'); // 打开右侧样式板
  else if (action === 'remove') {
    if(confirm(`移除 "${layer.name}"?`)) mapStore.removeLayer(layer.id);
  } 
  else if (action === 'zoom') emit('zoom-to-layer', layer.id);
  
  clearContextMenu();
}
</script>

<style scoped>
/* 样式保持与上一版 LayerManager 一致，略去重复部分，请直接使用上个回复的样式 */
.layer-manager { height: 100%; display: flex; flex-direction: column; background: #fff; border-right: 1px solid #e0e0e0; user-select: none; }
.toc-header { padding: 10px 16px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 13px; color: #374151; }
.layer-list { flex: 1; overflow-y: auto; padding: 8px; }
.empty-layers { padding: 32px; text-align: center; color: #9ca3af; font-size: 13px; }
.layer-item { display: flex; align-items: center; padding: 6px 8px; border-radius: 4px; margin-bottom: 2px; cursor: pointer; transition: background 0.1s; }
.layer-item:hover { background: #f3f4f6; }
.layer-item.active { background: #e0f2fe; border: 1px solid #bae6fd; }
.layer-visibility input { margin-right: 8px; }
.layer-symbology { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; margin-right: 8px; }
.symbol-preview { display: block; width: 12px; height: 12px; border-radius: 2px; border: 1px solid rgba(0,0,0,0.2); }
.layer-content { flex: 1; overflow: hidden; }
.layer-name { font-size: 13px; color: #1f2937; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; display: block; }
.drag-handle { display: flex; flex-direction: column; opacity: 0; }
.layer-item:hover .drag-handle { opacity: 1; }
.mini-btn { border: none; background: none; font-size: 8px; cursor: pointer; padding: 0 2px; color: #9ca3af; }
.context-menu { position: fixed; background: white; border: 1px solid #d1d5db; border-radius: 4px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); z-index: 9999; min-width: 140px; padding: 4px 0; font-size: 13px; }
.menu-item { padding: 6px 12px; cursor: pointer; color: #374151; }
.menu-item:hover { background: #f3f4f6; }
.menu-item.header { font-weight: 600; color: #111; background: #f9fafb; pointer-events: none; }
.menu-item.delete { color: #ef4444; }
.menu-divider { height: 1px; background: #e5e7eb; margin: 4px 0; }
</style>