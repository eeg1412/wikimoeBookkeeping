import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../pages/Login.vue')
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../pages/Reports.vue')
      },
      {
        path: 'transactions',
        name: 'Transactions',
        component: () => import('../pages/Transactions.vue')
      },
      {
        path: 'transactions/new',
        name: 'TransactionNew',
        component: () => import('../pages/TransactionForm.vue')
      },
      {
        path: 'transactions/:id/edit',
        name: 'TransactionEdit',
        component: () => import('../pages/TransactionForm.vue')
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('../pages/Categories.vue')
      },
      {
        path: 'recurring',
        name: 'Recurring',
        component: () => import('../pages/Recurring.vue')
      },
      {
        path: 'recurring/new',
        name: 'RecurringNew',
        component: () => import('../pages/RecurringForm.vue')
      },
      {
        path: 'recurring/:id/edit',
        name: 'RecurringEdit',
        component: () => import('../pages/RecurringForm.vue')
      },
      {
        path: 'reports',
        name: 'Reports',
        redirect: { name: 'Dashboard' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../pages/Settings.vue')
      },
      {
        path: 'data',
        name: 'DataManage',
        component: () => import('../pages/DataManage.vue')
      },
      {
        path: 'login-attempts',
        name: 'LoginAttempts',
        component: () => import('../pages/LoginAttempts.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(to => {
  const token = localStorage.getItem('token')
  if (!token && to.name !== 'Login') {
    return { name: 'Login' }
  }
  if (token && to.name === 'Login') {
    return { name: 'Dashboard' }
  }
})

export default router
