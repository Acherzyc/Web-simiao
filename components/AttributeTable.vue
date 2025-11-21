<template>
  <div class="attribute-table-panel" :style="{ height: panelHeight + 'px' }">
    <div class="resize-handle" @mousedown="startResize"></div>

    <div class="table-header">
      <div class="header-left">
        <span class="layer-badge" :class="layerType">{{ layerTypeText }}</span>
        <span class="layer-name">{{ layerName }}</span>
        <span class="feature-count">{{ rowData.length }} 个要素</span>
      </div>
      <div class="header-right">
        <button class="tool-btn" @click="exportCSV" title="导出CSV">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/></svg>
          导出
        </button>
        <button class="tool-btn close" @click="$emit('close')" title="关闭表格">×</button>
      </div>
    </div>

    <div class="grid-wrapper">
      <ag-grid-vue
        class="ag-theme-quartz"
        style="width: 100%; height: 100%;"
        :rowData="rowData"
        :columnDefs="columnDefs"
        :defaultColDef="defaultColDef"
        rowSelection="single"
        :suppressRowClickSelection="true"
        @grid-ready="onGridReady"
        @cell-clicked="onCellClicked"
        @cell-value-changed="onCellValueChanged"
      >
      </ag-grid-vue>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { AgGridVue } from "ag-grid-vue3";
import { useMapStore } from '~/stores/mapStore';

const emit = defineEmits(['close', 'zoom-to-feature']);
const mapStore = useMapStore();

// 状态
const panelHeight = ref(300);
const gridApi = ref(null);

// 计算属性：获取当前要展示的图层数据
const targetLayer = computed(() => mapStore.tableLayer);
const layerName = computed(() => targetLayer.value?.name || '未选择图层');
const layerType = computed(() => targetLayer.value?.type || 'point');
const layerTypeText = computed(() => {
  const map = { point: '点', polyline: '线', polygon: '面' };
  return map[layerType.value] || '未知';
});

// 转换数据供 Ag-Grid 使用
const rowData = computed(() => {
  if (!targetLayer.value) return [];
  return targetLayer.value.features.map(f => ({
    _id: f.id, // 内部ID，用于反向查找
    ...f.properties
  }));
});

// 动态生成列定义
const columnDefs = computed(() => {
  if (rowData.value.length === 0) return [];
  // 排除内部ID，获取所有属性键
  const keys = Object.keys(rowData.value[0]).filter(k => k !== '_id');
  
  // 默认列定义
  return keys.map(key => ({
    field: key,
    headerName: key,
    filter: true,
    editable: true,
    sortable: true,
  }));
});

const defaultColDef = {
  flex: 1,
  minWidth: 100,
  resizable: true,
  filter: 'agTextColumnFilter',
  floatingFilter: true, // 开启快捷筛选栏
};

// 事件处理
function onGridReady(params) {
  gridApi.value = params.api;
  params.api.sizeColumnsToFit();
}

// 点击单元格时选中地图要素
function onCellClicked(event) {
  const featureId = event.data._id;
  mapStore.selectFeature(featureId); // 高亮
  emit('zoom-to-feature', featureId); // 缩放
}

// 编辑单元格后同步回 Store
function onCellValueChanged(event) {
  const featureId = event.data._id;
  const key = event.colDef.field;
  const value = event.newValue;
  
  console.log(`更新属性: ID=${featureId}, ${key}=${value}`);
  mapStore.updateFeatureProperties(featureId, { [key]: value });
}

function exportCSV() {
  gridApi.value?.exportDataAsCsv({ fileName: `${layerName.value}_Export.csv` });
}

// 拖拽调整高度
function startResize(e) {
  e.preventDefault();
  const startY = e.clientY;
  const startH = panelHeight.value;
  
  const onMouseMove = (ev) => {
    const delta = startY - ev.clientY;
    panelHeight.value = Math.max(150, Math.min(window.innerHeight - 100, startH + delta));
  };
  
  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}
</script>

<style scoped>
.attribute-table-panel {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #d1d5db;
  display: flex;
  flex-direction: column;
  z-index: 40; /* 确保在地图之上 */
  box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
  transition: height 0.1s ease-out;
}

.resize-handle {
  height: 6px;
  background: #f3f4f6;
  cursor: ns-resize;
  border-top: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
}
.resize-handle:hover { background: #3b82f6; }
.resize-handle::after {
  content: ''; position: absolute; top: 2px; left: 50%; transform: translateX(-50%);
  width: 40px; height: 2px; background: #cbd5e1; border-radius: 2px;
}

.table-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
}

.header-left { display: flex; align-items: center; gap: 10px; }
.layer-badge {
  font-size: 10px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
  font-weight: 700; color: white;
}
.layer-badge.point { background: #ef4444; }
.layer-badge.polyline { background: #3b82f6; }
.layer-badge.polygon { background: #10b981; }

.layer-name { font-weight: 600; font-size: 14px; color: #1e293b; }
.feature-count { font-size: 12px; color: #64748b; background: #e2e8f0; padding: 2px 8px; border-radius: 12px; }

.header-right { display: flex; gap: 8px; }
.tool-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border: 1px solid #cbd5e1; background: white;
  border-radius: 4px; font-size: 12px; color: #475569; cursor: pointer;
  transition: all 0.2s;
}
.tool-btn:hover { background: #f1f5f9; color: #0f172a; border-color: #94a3b8; }
.tool-btn.close { border: none; font-size: 18px; padding: 0 8px; background: transparent; }
.tool-btn.close:hover { color: #ef4444; background: #fee2e2; }

.grid-wrapper { flex: 1; overflow: hidden; }

/* AG Grid 自定义微调 */
:deep(.ag-root-wrapper) { border: none !important; }
:deep(.ag-header) { background-color: #f8fafc; border-bottom-color: #e2e8f0; }
:deep(.ag-row-selected) { background-color: #eff6ff !important; }
</style>