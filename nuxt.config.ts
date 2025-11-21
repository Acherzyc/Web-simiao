export default defineNuxtConfig({
  ssr: false,
  css: [
    '~/assets/css/main.css',
    'ag-grid-community/styles/ag-grid.css',
    'ag-grid-community/styles/ag-theme-quartz.css'
  ],
  app: {
    head: {
      title: 'SuperMap Pro (ArcGIS Style)',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
      ],
      script: [
        {
          innerHTML: `window._AMapSecurityConfig = { securityJsCode: '4bd78013b9b1e6d56bb8868748a7ed77' }`,
          type: 'text/javascript',
        },
        {
          src: `https://webapi.amap.com/maps?v=2.0&key=ce5fe3ad94d38363f962a5a02a3c8654&plugin=AMap.AutoComplete,AMap.PlaceSearch,AMap.DistrictSearch,AMap.Scale,AMap.ToolBar,AMap.MouseTool,AMap.PolyEditor,AMap.RangingTool,AMap.GeoJSON,AMap.LabelMarker`,
          defer: true, 
        },
        { src: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js' },
        { src: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js' },
      ],
    },
  },
  modules: ['@nuxtjs/supabase', '@pinia/nuxt'],
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    redirectOptions: { login: '/login', callback: '/confirm', exclude: ['/register', '/share/**'] },
  },
  compatibilityDate: '2025-09-25',
})