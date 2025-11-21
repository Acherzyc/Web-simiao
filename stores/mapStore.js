import { defineStore } from 'pinia';
import gcoord from 'gcoord';
import * as turf from '@turf/turf';

export const useMapStore = defineStore('map', {
  state: () => ({
    layers: [], 
    activeLayerId: null,
    selectedFeatureId: null,
    
    // UI 状态
    isTableVisible: false, // 属性表显示状态
    tableLayerId: null,    // 属性表当前展示的图层
    activePanel: null,     // 右侧面板状态: 'inspector' | 'style' | 'analysis'
    
    nextLayerId: 1,
    nextFeatureId: 1,
  }),

  getters: {
    activeLayer: (state) => state.layers.find(l => l.id === state.activeLayerId),
    tableLayer: (state) => state.layers.find(l => l.id === state.tableLayerId),
    
    selectedFeature: (state) => {
      if (!state.selectedFeatureId) return null;
      for (const layer of state.layers) {
        const feat = layer.features.find(f => f.id === state.selectedFeatureId);
        if (feat) return { ...feat, layerId: layer.id };
      }
      return null;
    },

    allVisibleFeatures: (state) => {
      const sortedLayers = [...state.layers].sort((a, b) => a.zIndex - b.zIndex);
      return sortedLayers
        .filter(l => l.visible)
        .flatMap(l => l.features.map(f => ({
          ...f,
          style: { 
            ...l.style, 
            ...(f.style || {}),
            label: { ...l.style.label, ...(f.style?.label || {}) },
            opacity: (f.style?.opacity ?? l.style.opacity ?? 1) * (l.opacity ?? 1),
            fillOpacity: (f.style?.fillOpacity ?? l.style.fillOpacity ?? 0.3) * (l.opacity ?? 1),
            strokeOpacity: (f.style?.strokeOpacity ?? l.style.strokeOpacity ?? 1) * (l.opacity ?? 1),
          },
          layerId: l.id
        })));
    }
  },

  actions: {
    // --- 界面交互 (关键修复) ---
    openAttributeTable(layerId) {
      this.tableLayerId = layerId;
      this.isTableVisible = true;
    },

    selectFeature(featureId) {
      this.selectedFeatureId = featureId;
      if (featureId) {
        // 选中要素时，如果当前没有打开其他面板，默认打开属性检查器
        if (!this.activePanel) {
           // this.activePanel = 'inspector'; // 可选：强制打开右侧面板
        }
      }
    },

    openPanel(panelName) {
      this.activePanel = panelName;
    },
    
    closePanel() {
      this.activePanel = null;
      this.selectedFeatureId = null;
    },

    // --- 图层操作 ---
    addLayer(name, type = 'point', features = []) {
      const processedFeatures = features.map(f => ({
        ...f,
        id: f.id || `feat_${this.nextFeatureId++}`,
        type: this.normalizeType(f.geometry?.type || type),
        properties: f.properties || {},
        geometry: f.geometry
      }));

      const maxZ = this.layers.length > 0 ? Math.max(...this.layers.map(l => l.zIndex || 0)) : 0;

      const newLayer = {
        id: `layer_${this.nextLayerId++}`,
        name: name || `图层 ${this.nextLayerId}`,
        type: this.normalizeType(type),
        visible: true,
        opacity: 1,
        zIndex: maxZ + 1,
        style: this.getDefaultStyle(type),
        features: processedFeatures
      };

      this.layers.unshift(newLayer);
      this.activeLayerId = newLayer.id;
      return newLayer;
    },

    removeLayer(layerId) {
      this.layers = this.layers.filter(l => l.id !== layerId);
      if (this.activeLayerId === layerId) this.activeLayerId = null;
      if (this.tableLayerId === layerId) {
        this.isTableVisible = false;
        this.tableLayerId = null;
      }
    },

    reorderLayer(layerId, newIndex) {
      const oldIndex = this.layers.findIndex(l => l.id === layerId);
      if (oldIndex < 0) return;
      const item = this.layers.splice(oldIndex, 1)[0];
      this.layers.splice(newIndex, 0, item);
      const total = this.layers.length;
      this.layers.forEach((layer, idx) => { layer.zIndex = total - idx; });
    },

    setLayerOpacity(layerId, opacity) {
      const layer = this.layers.find(l => l.id === layerId);
      if (layer) layer.opacity = opacity;
    },

    toggleLayerVisibility(layerId) {
      const layer = this.layers.find(l => l.id === layerId);
      if (layer) layer.visible = !layer.visible;
    },

    // --- 样式与属性 ---
    updateLayerStyle(layerId, newStyle) {
      const layer = this.layers.find(l => l.id === layerId);
      if (layer) {
        layer.style = { ...layer.style, ...newStyle };
      }
    },

    updateFeatureProperties(featureId, newProps) {
      for (const layer of this.layers) {
        const feat = layer.features.find(f => f.id === featureId);
        if (feat) {
          feat.properties = { ...feat.properties, ...newProps };
          break;
        }
      }
    },

    // --- 空间分析工具 ---
    runBufferAnalysis(layerId, distance) {
      const layer = this.layers.find(l => l.id === layerId);
      if (!layer) return;
      try {
        const buffered = turf.buffer(
          turf.featureCollection(layer.features), 
          distance, 
          { units: 'kilometers' }
        );
        // 缓冲区也是一个图层
        this.addLayer(`${layer.name}_Buffer_${distance}km`, 'polygon', buffered.features);
      } catch (e) {
        console.error(e);
        throw new Error('缓冲区分析失败，请确保数据包含有效的几何信息');
      }
    },

    runGridAnalysis(layerId, field) {
      const layer = this.layers.find(l => l.id === layerId);
      if (!layer || layer.type !== 'point') throw new Error('仅支持点图层');

      const points = turf.featureCollection(layer.features.map(f => turf.point(f.geometry.coordinates, { value: parseFloat(f.properties[field]) || 0 })));
      const bbox = turf.bbox(points);
      // 0.5km 的网格
      const grid = turf.squareGrid(bbox, 0.5, { units: 'kilometers' });
      const aggregated = turf.collect(grid, points, 'value', 'values');
      
      const resultFeatures = aggregated.features.filter(f => f.properties.values.length > 0).map(f => {
         const sum = f.properties.values.reduce((a, b) => a + b, 0);
         const avg = sum / f.properties.values.length;
         let color = '#00AA00';
         // 简单分级 (示例阈值，实际可做成动态输入)
         if (avg > 80000) color = '#FF0000';
         else if (avg > 50000) color = '#FFAA00';
         else if (avg > 30000) color = '#FFFF00';

         return {
           type: 'Feature',
           geometry: f.geometry,
           properties: { avg_val: avg.toFixed(0), count: f.properties.values.length },
           style: { fillColor: color, fillOpacity: 0.6, strokeColor: 'transparent' }
         };
      });

      this.addLayer(`${field}_热力网格`, 'polygon', resultFeatures);
    },

    // --- Helpers ---
    transformGeoJSON(geojson, sourceCRS) {
        if (!geojson || !geojson.features) return [];
        if (sourceCRS === 'GCJ02') return geojson.features;
        return geojson.features.map(feature => {
            const newFeature = JSON.parse(JSON.stringify(feature));
            const transformCoord = (coord) => gcoord.transform(coord, gcoord[sourceCRS], gcoord.GCJ02);
            const geom = newFeature.geometry;
            if (!geom) return newFeature;
            if (geom.type === 'Point') geom.coordinates = transformCoord(geom.coordinates);
            else if (geom.type === 'LineString') geom.coordinates = geom.coordinates.map(c => transformCoord(c));
            else if (geom.type === 'Polygon') geom.coordinates = geom.coordinates.map(ring => ring.map(c => transformCoord(c)));
            else if (geom.type === 'MultiPolygon') geom.coordinates = geom.coordinates.map(poly => poly.map(ring => ring.map(c => transformCoord(c))));
            return newFeature;
        });
    },
    
    normalizeType(type) {
      const t = (type || '').toLowerCase();
      if (t.includes('point')) return 'point';
      if (t.includes('line')) return 'polyline';
      if (t.includes('polygon')) return 'polygon';
      return 'point';
    },

    getDefaultStyle(type) {
      const t = this.normalizeType(type);
      const commonLabel = { show: false, field: 'name', color: '#333', fontSize: 12, offset: [0, -20] };
      
      if (t === 'point') return { 
        fillColor: '#FF4444', borderColor: '#FFFFFF', size: 12, opacity: 1,
        label: commonLabel
      };
      if (t === 'polyline') return { 
        color: '#0066FF', weight: 4, opacity: 0.8, style: 'solid',
        label: commonLabel
      };
      if (t === 'polygon') return { 
        fillColor: '#00AA00', fillOpacity: 0.4, strokeColor: '#00AA00', strokeWeight: 2, strokeOpacity: 1,
        label: { ...commonLabel, offset: [0, 0] }
      };
      return {};
    }
  }
});