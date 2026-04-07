export const DEFAULT_CATEGORY_ICON = 'folder'
export const COMMON_CATEGORY_ICON = 'wallet-credit-card'

export const CATEGORY_ICON_GROUPS = [
  {
    id: 'common',
    label: '通用与资金',
    types: ['expense', 'income'],
    icons: [
      { name: COMMON_CATEGORY_ICON, label: '通用' },
      { name: DEFAULT_CATEGORY_ICON, label: '文件夹' },
      { name: 'clipboard', label: '清单' },
      { name: 'money', label: '现金' },
      { name: 'wallet', label: '钱包' },
      { name: 'coin', label: '零钱' },
      { name: 'bank', label: '银行' },
      { name: 'payment', label: '支付' },
      { name: 'income', label: '收入' },
      { name: 'receipt', label: '账单' }
    ]
  },
  {
    id: 'shopping',
    label: '购物与居住',
    types: ['expense'],
    icons: [
      { name: 'shopping-cart', label: '购物车' },
      { name: 'shopping-bag', label: '购物袋' },
      { name: 'building-shop', label: '小店' },
      { name: 'building-retail', label: '商场' },
      { name: 'home', label: '住宅' },
      { name: 'building-home', label: '居家' },
      { name: 'gift', label: '礼物' }
    ]
  },
  {
    id: 'food',
    label: '餐饮与买菜',
    types: ['expense'],
    icons: [
      { name: 'food', label: '正餐' },
      { name: 'food-pizza', label: '快餐' },
      { name: 'food-apple', label: '水果' },
      { name: 'food-carrot', label: '蔬菜' },
      { name: 'food-grains', label: '粮油' },
      { name: 'coffee', label: '咖啡' },
      { name: 'drinks', label: '饮料' },
      { name: 'beer', label: '啤酒' },
      { name: 'wine', label: '红酒' },
      { name: 'cake', label: '甜品' }
    ]
  },
  {
    id: 'travel',
    label: '出行与旅行',
    types: ['expense'],
    icons: [
      { name: 'car', label: '开车' },
      { name: 'bus', label: '公交' },
      { name: 'subway', label: '地铁' },
      { name: 'bicycle', label: '骑行' },
      { name: 'flight', label: '飞机' },
      { name: 'ship', label: '轮船' },
      { name: 'globe', label: '出境' },
      { name: 'beach', label: '度假' },
      { name: 'bed', label: '住宿' },
      { name: 'umbrella', label: '保险' }
    ]
  },
  {
    id: 'digital',
    label: '数码与娱乐',
    types: ['expense'],
    icons: [
      { name: 'phone', label: '手机' },
      { name: 'computer', label: '电脑' },
      { name: 'camera', label: '相机' },
      { name: 'video', label: '视频' },
      { name: 'movies', label: '影视' },
      { name: 'tv', label: '电视' },
      { name: 'music', label: '音乐' },
      { name: 'games', label: '游戏' },
      { name: 'ticket', label: '门票' }
    ]
  },
  {
    id: 'services',
    label: '生活服务',
    types: ['expense'],
    icons: [
      { name: 'style', label: '穿搭' },
      { name: 'cut', label: '理发' },
      { name: 'call', label: '通讯' },
      { name: 'tools', label: '工具' },
      { name: 'wrench', label: '维修' },
      { name: 'lightbulb', label: '照明' },
      { name: 'flash', label: '电费' },
      { name: 'plug', label: '家电' },
      { name: 'network', label: '网络' },
      { name: 'washer', label: '清洁' },
      { name: 'leaf', label: '环保' }
    ]
  },
  {
    id: 'family',
    label: '家庭与健康',
    types: ['expense'],
    icons: [
      { name: 'family', label: '家庭' },
      { name: 'medical', label: '就医' },
      { name: 'pill', label: '药品' },
      { name: 'cat', label: '猫咪' },
      { name: 'dog', label: '狗狗' },
      { name: 'paw', label: '宠物' }
    ]
  },
  {
    id: 'growth',
    label: '学习与运动',
    types: ['expense'],
    icons: [
      { name: 'book', label: '书籍' },
      { name: 'education', label: '课程' },
      { name: 'sport', label: '运动' },
      { name: 'trophy', label: '比赛' }
    ]
  },
  {
    id: 'income-salary',
    label: '工资与奖金',
    types: ['income'],
    icons: [
      { name: 'income', label: '工资' },
      { name: 'bank', label: '银行入账' },
      { name: 'wallet', label: '钱包入账' },
      { name: 'money', label: '现金收入' },
      { name: 'payment', label: '收款' },
      { name: 'coin', label: '零钱收入' },
      { name: 'gift', label: '奖金礼金' },
      { name: 'receipt', label: '回款单据' }
    ]
  },
  {
    id: 'income-business',
    label: '生意与副业',
    types: ['income'],
    icons: [
      { name: 'building-shop', label: '门店收入' },
      { name: 'building-retail', label: '零售收入' },
      { name: 'shopping-bag', label: '带货销售' },
      { name: 'shopping-cart', label: '电商收入' },
      { name: 'tools', label: '服务接单' },
      { name: 'computer', label: '线上副业' },
      { name: 'phone', label: '通讯业务' },
      { name: 'globe', label: '海外收入' }
    ]
  },
  {
    id: 'income-transfer',
    label: '报销与补助',
    types: ['income'],
    icons: [
      { name: 'clipboard', label: '报销' },
      { name: 'receipt', label: '退款返还' },
      { name: 'payment', label: '补贴补助' },
      { name: 'family', label: '家庭转入' },
      { name: 'gift', label: '礼金红包' },
      { name: 'call', label: '佣金提成' }
    ]
  },
  {
    id: 'income-assets',
    label: '理财与资产',
    types: ['income'],
    icons: [
      { name: 'bank', label: '利息分红' },
      { name: 'coin', label: '理财收益' },
      { name: 'wallet', label: '资产转入' },
      { name: 'money', label: '租金收入' },
      { name: 'payment', label: '投资回款' },
      { name: 'globe', label: '汇入转账' }
    ]
  },
  {
    id: 'income-creative',
    label: '创作与内容',
    types: ['income'],
    icons: [
      { name: 'camera', label: '摄影拍摄' },
      { name: 'video', label: '视频创作' },
      { name: 'music', label: '音乐版权' },
      { name: 'book', label: '写作稿费' },
      { name: 'education', label: '课程培训' },
      { name: 'computer', label: '技术外包' }
    ]
  }
]

export const CATEGORY_ICON_NAMES = Array.from(
  new Set(
    CATEGORY_ICON_GROUPS.flatMap(group => group.icons.map(icon => icon.name))
  )
)

export const LEGACY_CATEGORY_ICON_MAP = {
  '📁': DEFAULT_CATEGORY_ICON,
  '🧾': 'receipt',
  '🍔': 'food',
  '🍕': 'food-pizza',
  '🍎': 'food-apple',
  '🥕': 'food-carrot',
  '🌾': 'food-grains',
  '🛒': 'shopping-cart',
  '🛍️': 'shopping-bag',
  '🏪': 'building-shop',
  '🏬': 'building-retail',
  '🏠': 'home',
  '🏘️': 'building-home',
  '🚗': 'car',
  '🚌': 'bus',
  '🚇': 'subway',
  '🚲': 'bicycle',
  '✈️': 'flight',
  '🚢': 'ship',
  '🌍': 'globe',
  '🏖️': 'beach',
  '🛏️': 'bed',
  '☂️': 'umbrella',
  '🎮': 'games',
  '📱': 'phone',
  '💻': 'computer',
  '📷': 'camera',
  '📺': 'tv',
  '👔': 'style',
  '👗': 'style',
  '💄': 'style',
  '💇': 'cut',
  '🏥': 'medical',
  '💊': 'pill',
  '📚': 'book',
  '🎓': 'education',
  '🎬': 'video',
  '🎵': 'music',
  '⚽': 'sport',
  '🏆': 'trophy',
  '🎟️': 'ticket',
  '🏋️': 'sport',
  '🐱': 'cat',
  '🐶': 'dog',
  '🐾': 'paw',
  '👶': 'family',
  '🎁': 'gift',
  '💰': 'money',
  '📈': 'income',
  '💳': 'payment',
  '🏦': 'bank',
  '💵': 'wallet',
  '🪙': 'coin',
  '☕': 'coffee',
  '🍺': 'beer',
  '🍷': 'wine',
  '🎂': 'cake',
  '🔧': 'tools',
  '🪛': 'wrench',
  '📞': 'call',
  '💡': 'lightbulb',
  '⚡': 'flash',
  '🔌': 'plug',
  '📶': 'network',
  wifi: 'network',
  '🧺': 'washer',
  '🌿': 'leaf',
  '🚰': 'lightbulb',
  '🗑️': 'delete'
}

const CATEGORY_ICON_NAME_SET = new Set(CATEGORY_ICON_NAMES)

export function normalizeCategoryIconName(iconName) {
  const value = String(iconName || '').trim()
  if (!value) return DEFAULT_CATEGORY_ICON

  const normalized = LEGACY_CATEGORY_ICON_MAP[value] || value
  if (CATEGORY_ICON_NAME_SET.has(normalized)) {
    return normalized
  }

  return DEFAULT_CATEGORY_ICON
}
