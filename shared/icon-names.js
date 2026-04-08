export const DEFAULT_CATEGORY_ICON = 'folder'
export const COMMON_CATEGORY_ICON = 'wallet-credit-card'

function dedupeGroupIcons(iconList) {
  const seenIconNames = new Set()

  return (iconList || []).filter(icon => {
    if (!icon?.name || seenIconNames.has(icon.name)) {
      return false
    }

    seenIconNames.add(icon.name)
    return true
  })
}

const RAW_CATEGORY_ICON_GROUPS = [
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
      { name: 'gift-card', label: '礼品卡' },
      { name: 'tag', label: '折扣标签' },
      { name: 'tag-percent', label: '优惠折扣' },
      { name: 'receipt-bag', label: '购物小票' },
      { name: 'building-shop', label: '小店' },
      { name: 'building-retail', label: '商场' },
      { name: 'real-estate', label: '房产地产' },
      { name: 'furniture', label: '家具' },
      { name: 'door', label: '门窗' },
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
      { name: 'drink-bottle', label: '瓶装饮品' },
      { name: 'food-egg', label: '鸡蛋早餐' },
      { name: 'food-apple', label: '水果' },
      { name: 'food-carrot', label: '蔬菜' },
      { name: 'food-fish', label: '海鲜' },
      { name: 'food-grains', label: '粮油' },
      { name: 'lunch', label: '午餐便当' },
      { name: 'ramen', label: '面食拉面' },
      { name: 'kitchen', label: '厨房用品' },
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
      { name: 'motorcycle', label: '摩托' },
      { name: 'taxi', label: '出租车' },
      { name: 'bus', label: '公交' },
      { name: 'subway', label: '地铁' },
      { name: 'bicycle', label: '骑行' },
      { name: 'parking', label: '停车费' },
      { name: 'toll', label: '高速过路' },
      { name: 'flight', label: '飞机' },
      { name: 'ship', label: '轮船' },
      { name: 'compass', label: '旅行导航' },
      { name: 'luggage', label: '行李用品' },
      { name: 'map', label: '导航' },
      { name: 'gas', label: '加油' },
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
      { name: 'headphones', label: '耳机' },
      { name: 'camera', label: '相机' },
      { name: 'video', label: '视频' },
      { name: 'movies', label: '影视' },
      { name: 'tv', label: '电视' },
      { name: 'music', label: '音乐' },
      { name: 'games', label: '游戏' },
      { name: 'xbox-controller', label: '游戏主机' },
      { name: 'playing-cards', label: '卡牌桌游' },
      { name: 'tetris-app', label: '电子游戏' },
      { name: 'billiards', label: '台球' },
      { name: 'bowling', label: '保龄球' },
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
      { name: 'paint-brush', label: '装修' },
      { name: 'tools', label: '工具' },
      { name: 'service-bell', label: '到家服务' },
      { name: 'wrench', label: '维修' },
      { name: 'shield', label: '保障' },
      { name: 'laundry', label: '洗衣服务' },
      { name: 'spa', label: '美容 SPA' },
      { name: 'fitness-center', label: '健身房' },
      { name: 'swimming-pool', label: '游泳运动' },
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
      { name: 'heart', label: '关爱' },
      { name: 'medical', label: '就医' },
      { name: 'stethoscope', label: '体检' },
      { name: 'eye-care', label: '眼科视力' },
      { name: 'pill', label: '药品' },
      { name: 'syringe', label: '注射疫苗' },
      { name: 'hospital', label: '医院' },
      { name: 'cat', label: '猫咪' },
      { name: 'dog', label: '狗狗' },
      { name: 'paw', label: '宠物' },
      { name: 'pet-store', label: '宠物门店' }
    ]
  },
  {
    id: 'growth',
    label: '学习与运动',
    types: ['expense'],
    icons: [
      { name: 'book', label: '书籍' },
      { name: 'notebook', label: '笔记' },
      { name: 'education', label: '课程' },
      { name: 'guitar', label: '乐器' },
      { name: 'microscope', label: '科学研究' },
      { name: 'library', label: '图书馆' },
      { name: 'certificate', label: '证书培训' },
      { name: 'sport', label: '运动' },
      { name: 'star', label: '兴趣' },
      { name: 'trophy', label: '比赛' }
    ]
  },
  {
    id: 'work',
    label: '工作与创作',
    types: ['expense', 'income'],
    icons: [
      { name: 'briefcase', label: '工作' },
      { name: 'office-building', label: '办公楼' },
      { name: 'palette', label: '设计创作' },
      { name: 'brush', label: '绘画工具' }
    ]
  },
  {
    id: 'income-salary',
    label: '工资与奖金',
    types: ['income'],
    icons: [
      { name: 'income', label: '工资' },
      { name: 'balance', label: '结算' },
      { name: 'star', label: '绩效奖金' },
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
      { name: 'tag', label: '促销返利' },
      { name: 'gift-card', label: '储值卡' },
      { name: 'shopping-bag', label: '带货销售' },
      { name: 'shopping-cart', label: '电商收入' },
      { name: 'service-bell', label: '服务收入' },
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
      { name: 'notes', label: '补助单据' },
      { name: 'receipt', label: '退款返还' },
      { name: 'payment', label: '补贴补助' },
      { name: 'shield', label: '保险理赔' },
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
      { name: 'savings', label: '储蓄收益' },
      { name: 'coin', label: '理财收益' },
      { name: 'coupon', label: '优惠返利' },
      { name: 'percent', label: '利息比例' },
      { name: 'money-hand', label: '租金分成' },
      { name: 'wallet', label: '资产转入' },
      { name: 'money', label: '租金收入' },
      { name: 'money-settings', label: '理财结算' },
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
      { name: 'headphones', label: '播客音频' },
      { name: 'music', label: '音乐版权' },
      { name: 'book', label: '写作稿费' },
      { name: 'notebook', label: '专栏写作' },
      { name: 'education', label: '课程培训' },
      { name: 'guitar', label: '乐器演出' },
      { name: 'computer', label: '技术外包' }
    ]
  }
]

export const CATEGORY_ICON_GROUPS = RAW_CATEGORY_ICON_GROUPS.map(group => ({
  ...group,
  icons: dedupeGroupIcons(group.icons)
}))

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
  '💹': 'savings',
  '🪙': 'coin',
  '🏷️': 'tag',
  '💝': 'gift-card',
  '☕': 'coffee',
  '🍾': 'drink-bottle',
  '🍺': 'beer',
  '🍷': 'wine',
  '🐟': 'food-fish',
  '🎂': 'cake',
  '🏍️': 'motorcycle',
  '🗺️': 'map',
  '⛽': 'gas',
  '🎧': 'headphones',
  '🔧': 'tools',
  '🪛': 'wrench',
  '🎨': 'paint-brush',
  '🛎️': 'service-bell',
  '📞': 'call',
  '🛡️': 'shield',
  '💡': 'lightbulb',
  '⚡': 'flash',
  '🔌': 'plug',
  '📶': 'network',
  wifi: 'network',
  '🧺': 'washer',
  '🌿': 'leaf',
  '❤️': 'heart',
  '🩺': 'stethoscope',
  '📓': 'notebook',
  '🎸': 'guitar',
  '⭐': 'star',
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
