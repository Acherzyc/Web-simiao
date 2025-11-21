<template>
  <div class="header">
    <div class="header-left">
      <div class="header-brand">
        <svg width="24" height="24" viewBox="0 0 1024 1024" class="logo-icon"><path d="M640 119.68l-256.64 96L96 122.24v674.56L384 904.32l256.64-96 287.36 93.44V227.2L640 119.68z m224 152.32v263.04l-399.36 49.28-46.08-313.6L640 187.52l224 84.48z m-704 200.32l214.4-60.16 26.24 180.48-240.64 29.44V472.32z m194.56-199.04l10.88 74.88-205.44 57.6V210.56l194.56 62.72zM160 752v-65.28l250.24-31.36 23.68 161.92-49.92 19.2-224-84.48z m479.36-11.52l-144 53.76-21.76-146.56 390.4-48.64v214.4l-224.64-72.96z" fill="#ffffff"></path></svg>
        <span class="brand-text">SuperMap Pro</span>
      </div>
      
      <div class="tool-group drawing-tools">
        <button class="tool-btn" :class="{ active: currentTool === 'select' }" @click="$emit('setTool', 'select')" title="选择要素 (Select)">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M7 2l12 11.2-5.8.5 3.3 7.3-2.2.9-3.2-7.4-4.4 4.6z"/></svg>
          <span>选择</span>
        </button>
        <div class="divider"></div>
        <button class="tool-btn" :class="{ active: currentTool === 'point' }" @click="$emit('setTool', 'point')" title="绘制点 (Point)">
          <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>
          <span>点</span>
        </button>
        <button class="tool-btn" :class="{ active: currentTool === 'polyline' }" @click="$emit('setTool', 'polyline')" title="绘制线 (Line)">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 17l6-10 6 10 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          <span>线</span>
        </button>
        <button class="tool-btn" :class="{ active: currentTool === 'polygon' }" @click="$emit('setTool', 'polygon')" title="绘制面 (Polygon)">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2L2 22h20L12 2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          <span>面</span>
        </button>
        <button class="tool-btn" :class="{ active: currentTool === 'ranging' }" @click="$emit('setTool', 'ranging')" title="测量距离">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M2 12h20v2H2z" fill="currentColor"/></svg>
          <span>测距</span>
        </button>
      </div>
    </div>

    <div class="header-center">
      <div class="tool-group data-tools">
        <button class="tool-btn primary" @click="$emit('openImportModal')">
          <span class="icon">📂</span> 添加数据
        </button>
        <button class="tool-btn" @click="$emit('openAnalysis')">
          <span class="icon">🧰</span> 分析工具
        </button>
        <button class="tool-btn" @click="$emit('openCloudPanel')">
          <span class="icon">☁️</span> 云端存档
        </button>
      </div>
    </div>

    <div class="header-right">
      <div class="tool-group extra-tools">
        <button class="icon-btn" @click="$emit('generateShareLink')" title="分享链接">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
        </button>
        <button class="icon-btn" @click="$emit('saveImage')" title="导出图片">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
        </button>
        <button class="icon-btn" @click="$emit('toggleMapStyle')" title="切换底图">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
        </button>
        <NuxtLink to="/notes" class="icon-btn" title="笔记管理" target="_blank">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
        </NuxtLink>
      </div>

      <div class="divider"></div>

      <div class="user-profile" v-if="user">
        <div class="user-avatar" :title="user.email">{{ user.email?.charAt(0).toUpperCase() }}</div>
        <button class="logout-btn" @click="handleLogout" title="退出登录">
          <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
        </button>
      </div>
      <div v-else>
        <NuxtLink to="/login" class="login-link">登录</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSupabaseClient, useSupabaseUser, navigateTo } from '#imports';

defineProps({ currentTool: String });
defineEmits([
  'setTool', 'openImportModal', 'openAnalysis', 'openCloudPanel', 
  'clearAll', 'generateShareLink', 'saveImage', 'toggleMapStyle'
]);

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const handleLogout = async () => {
  if (confirm('确定要退出登录吗？')) {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigateTo('/login');
    }
  }
};
</script>

<style scoped>
.header {
  background: #1f2937; color: #e5e7eb; height: 54px; display: flex; align-items: center; 
  padding: 0 16px; justify-content: space-between; border-bottom: 1px solid #374151;
  user-select: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-left, .header-center, .header-right { display: flex; align-items: center; height: 100%; }
.header-center { flex: 1; justify-content: center; }

.header-brand { display: flex; align-items: center; gap: 8px; margin-right: 24px; font-weight: 700; font-size: 16px; color: white; }
.logo-icon { filter: drop-shadow(0 0 2px rgba(255,255,255,0.3)); }

.tool-group { display: flex; align-items: center; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 3px; gap: 2px; }
.tool-group.drawing-tools { margin-right: 12px; }
.tool-group.extra-tools { background: transparent; }

.divider { width: 1px; height: 20px; background: #4b5563; margin: 0 8px; }

/* 按钮样式 */
.tool-btn {
  display: flex; align-items: center; gap: 6px; padding: 6px 10px; border: none; 
  background: transparent; color: #9ca3af; border-radius: 4px; cursor: pointer; 
  font-size: 13px; font-weight: 500; transition: all 0.15s;
}
.tool-btn:hover { background: rgba(255,255,255,0.1); color: white; }
.tool-btn.active { background: #3b82f6; color: white; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
.tool-btn.primary { color: #60a5fa; }
.tool-btn.primary:hover { color: #93c5fd; }
.tool-btn .icon { font-size: 14px; }

/* 仅图标按钮 */
.icon-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: #9ca3af; border-radius: 4px; cursor: pointer;
  transition: all 0.15s;
}
.icon-btn:hover { background: rgba(255,255,255,0.1); color: white; }

/* 用户区域 */
.user-profile { display: flex; align-items: center; gap: 8px; }
.user-avatar {
  width: 28px; height: 28px; background: #3b82f6; color: white; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold;
}
.logout-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: #ef4444; border-radius: 4px; cursor: pointer;
}
.logout-btn:hover { background: rgba(239, 68, 68, 0.15); }
.login-link { color: #3b82f6; text-decoration: none; font-size: 14px; font-weight: 500; padding: 6px 12px; }
.login-link:hover { text-decoration: underline; }

@media (max-width: 1024px) {
  .tool-btn span { display: none; } /* 小屏隐藏文字 */
  .header-brand .brand-text { display: none; }
}
</style>