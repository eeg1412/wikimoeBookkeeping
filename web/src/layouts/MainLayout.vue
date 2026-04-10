<template>
  <div class="min-h-screen bg-surface-secondary text-on-surface">
    <!-- Desktop sidebar -->
    <aside
      class="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col border-r border-border bg-border/80"
    >
      <div class="flex h-14 items-center gap-2 px-5 border-b border-border">
        <AppIcon name="brand" :size="22" class="text-primary" />
        <span class="font-bold text-lg text-on-surface">维基萌记账本</span>
      </div>
      <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-on-surface-secondary transition-colors hover:bg-surface/70 hover:text-on-surface"
          :class="isActive(item.to) ? '!bg-primary/10 !text-primary' : ''"
        >
          <AppIcon :name="item.icon" :size="20" class="w-6 text-center" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
      <div class="p-3 border-t border-border">
        <button
          @click="authStore.logout()"
          class="btn-ghost w-full text-sm justify-start gap-2"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          退出登录
        </button>
      </div>
    </aside>

    <!-- Mobile header -->
    <header
      class="lg:hidden sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-border/80 backdrop-blur px-4"
    >
      <div class="flex items-center gap-2">
        <AppIcon name="brand" :size="20" class="text-primary" />
        <span class="max-w-[11rem] truncate font-bold text-on-surface"
          >维基萌记账本</span
        >
      </div>
      <button
        @click="moreOpen = !moreOpen"
        class="btn-icon text-on-surface-secondary"
      >
        <AppIcon name="menu" :size="20" />
      </button>
    </header>

    <!-- Mobile menu overlay -->
    <Transition name="fade">
      <div
        v-if="moreOpen"
        class="lg:hidden fixed inset-0 z-30 bg-black/30"
        @click="moreOpen = false"
      ></div>
    </Transition>
    <Transition name="slide">
      <div
        v-if="moreOpen"
        class="lg:hidden fixed top-0 right-0 z-40 h-full w-64 bg-border/85 border-l border-border shadow-xl backdrop-blur"
      >
        <div
          class="flex h-14 items-center justify-between px-4 border-b border-border"
        >
          <span class="font-bold">菜单</span>
          <button
            @click="moreOpen = false"
            class="btn-icon text-on-surface-secondary"
          >
            <AppIcon name="close" :size="20" />
          </button>
        </div>
        <nav class="p-3 space-y-1">
          <router-link
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-on-surface-secondary hover:bg-surface/70 hover:text-on-surface"
            :class="isActive(item.to) ? '!bg-primary/10 !text-primary' : ''"
            @click="moreOpen = false"
          >
            <AppIcon :name="item.icon" :size="20" class="w-6 text-center" />
            <span>{{ item.label }}</span>
          </router-link>
        </nav>
        <div
          class="absolute bottom-0 left-0 right-0 p-3 border-t border-border safe-bottom"
        >
          <button
            @click="authStore.logout()"
            class="btn-ghost w-full text-sm justify-start gap-2"
          >
            退出登录
          </button>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div
        v-if="categoriesStore.migrationBusy"
        class="fixed inset-0 z-[60] bg-black/35 p-4 backdrop-blur-sm"
      >
        <div class="flex min-h-full items-center justify-center">
          <section
            class="w-full max-w-sm rounded-2xl border border-border bg-surface px-5 py-4 shadow-xl"
          >
            <h3 class="text-base font-semibold text-on-surface">
              正在迁移并删除分类
            </h3>
            <p class="mt-2 text-sm text-on-surface-secondary">
              当前正在迁移账目和周期规则，并删除原分类。处理中暂时禁止账目和周期规则写入，请稍候。
            </p>
          </section>
        </div>
      </div>
    </Transition>

    <!-- Main content -->
    <main class="lg:pl-60 pb-20 lg:pb-4">
      <div class="max-w-5xl mx-auto p-4">
        <router-view />
      </div>
    </main>

    <!-- Mobile bottom navigation -->
    <nav
      class="lg:hidden fixed bottom-0 inset-x-0 z-20 flex items-center justify-around border-t border-border bg-border/85 backdrop-blur safe-bottom h-16"
    >
      <router-link
        v-for="item in bottomNav"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-0.5 text-[10px] font-medium text-on-surface-secondary min-w-[56px] py-1"
        :class="isActive(item.to) ? '!text-primary' : ''"
      >
        <AppIcon :name="item.icon" :size="22" />
        <span>{{ item.label }}</span>
      </router-link>
      <router-link
        to="/transactions/new"
        class="flex flex-col items-center gap-0.5 min-w-[56px] py-1"
      >
        <span
          class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg -mt-4"
        >
          <AppIcon name="add" :size="20" />
        </span>
        <span class="text-[10px] font-medium text-primary">记账</span>
      </router-link>
      <router-link
        to="/categories"
        class="flex flex-col items-center gap-0.5 text-[10px] font-medium text-on-surface-secondary min-w-[56px] py-1"
        :class="isActive('/categories') ? '!text-primary' : ''"
      >
        <AppIcon name="categories" :size="22" />
        <span>分类</span>
      </router-link>
      <button
        @click="moreOpen = true"
        class="flex flex-col items-center gap-0.5 text-[10px] font-medium text-on-surface-secondary min-w-[56px] py-1"
      >
        <AppIcon name="menu" :size="22" />
        <span>更多</span>
      </button>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useSettingsStore } from '../stores/settings.js'
import { useCategoriesStore } from '../stores/categories.js'
import AppIcon from '../components/AppIcon.vue'

const route = useRoute()
const authStore = useAuthStore()
const settingsStore = useSettingsStore()
const categoriesStore = useCategoriesStore()
const moreOpen = ref(false)

function isActive(to) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(to + '/')
}

const navItems = [
  { to: '/', icon: 'overview', label: '总览' },
  { to: '/transactions', icon: 'transactions', label: '账目' },
  { to: '/categories', icon: 'categories', label: '分类' },
  { to: '/recurring', icon: 'recurring', label: '周期' },
  { to: '/data', icon: 'data', label: '数据' },
  { to: '/login-attempts', icon: 'security', label: '登录日志' },
  { to: '/settings', icon: 'settings', label: '设置' }
]

const bottomNav = [
  { to: '/', icon: 'overview', label: '总览' },
  { to: '/transactions', icon: 'transactions', label: '账目' }
]

onMounted(async () => {
  await settingsStore.fetch()
  await categoriesStore.fetch()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
