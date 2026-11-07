import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

export type AppIconName =
  | 'add'
  | 'add_link'
  | 'apartment'
  | 'arrow_forward'
  | 'checkmark'
  | 'check_box'
  | 'check_box_outline_blank'
  | 'chevron_left'
  | 'chevron_right'
  | 'close'
  | 'cloud_sync'
  | 'call'
  | 'badge'
  | 'contact_page'
  | 'bolt'
  | 'dashboard'
  | 'domain'
  | 'eco'
  | 'document'
  | 'delete'
  | 'document_scanner'
  | 'download'
  | 'fence'
  | 'folder_managed'
  | 'shield'
  | 'map'
  | 'menu_book'
  | 'water_drop'
  | 'water'
  | 'compass_calibration'
  | 'add_road'
  | 'expand_more'
  | 'view_agenda'
  | 'grid_view'
  | 'link'
  | 'more_vert'
  | 'edit'
  | 'content_copy'
  | 'calculate'
  | 'currency_rupee'
  | 'handshake'
  | 'info'
  | 'calendar_month'
  | 'chat'
  | 'account_balance'
  | 'account_balance_wallet'
  | 'sync_alt'
  | 'location_off'
  | 'location_on'
  | 'logout'
  | 'lock'
  | 'mail'
  | 'moon'
  | 'mic'
  | 'pause'
  | 'play'
  | 'person'
  | 'person_add'
  | 'photo_camera'
  | 'phone'
  | 'open_in_new'
  | 'search'
  | 'smartphone'
  | 'laptop'
  | 'fingerprint'
  | 'tune'
  | 'notifications'
  | 'timer'
  | 'translate'
  | 'visibility_off'
  | 'pause_circle'
  | 'pending_actions'
  | 'real_estate_agent'
  | 'restart_alt'
  | 'remove'
  | 'schedule'
  | 'settings'
  | 'share'
  | 'straighten'
  | 'sun'
  | 'task_alt'
  | 'verified'
  | 'verified_user'
  | 'upload_file'
  | 'visibility';

const SYMBOLS = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  add_link: { ios: 'link.badge.plus', android: 'add_link', web: 'add_link' },
  apartment: { ios: 'building.2.fill', android: 'apartment', web: 'apartment' },
  arrow_forward: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  checkmark: { ios: 'checkmark', android: 'check', web: 'check' },
  check_box: { ios: 'checkmark.square.fill', android: 'check_box', web: 'check_box' },
  check_box_outline_blank: { ios: 'square', android: 'check_box_outline_blank', web: 'check_box_outline_blank' },
  chevron_left: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  chevron_right: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  cloud_sync: { ios: 'arrow.triangle.2.circlepath', android: 'cloud_sync', web: 'cloud_sync' },
  call: { ios: 'phone.fill', android: 'call', web: 'call' },
  badge: { ios: 'person.text.rectangle', android: 'badge', web: 'badge' },
  contact_page: { ios: 'person.crop.rectangle', android: 'contact_page', web: 'contact_page' },
  bolt: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  dashboard: { ios: 'square.grid.2x2.fill', android: 'dashboard', web: 'dashboard' },
  domain: { ios: 'building.2', android: 'domain', web: 'domain' },
  eco: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
  document: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  delete: { ios: 'trash', android: 'delete', web: 'delete' },
  document_scanner: { ios: 'doc.viewfinder', android: 'document_scanner', web: 'document_scanner' },
  download: { ios: 'arrow.down.to.line', android: 'download', web: 'download' },
  fence: { ios: 'square.grid.3x3.square', android: 'fence', web: 'fence' },
  folder_managed: { ios: 'folder.fill', android: 'folder_managed', web: 'folder_managed' },
  shield: { ios: 'shield.fill', android: 'shield', web: 'shield' },
  map: { ios: 'map.fill', android: 'map', web: 'map' },
  menu_book: { ios: 'book.closed.fill', android: 'menu_book', web: 'menu_book' },
  water_drop: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  water: { ios: 'water.waves', android: 'water', web: 'water' },
  compass_calibration: { ios: 'safari.fill', android: 'explore', web: 'explore' },
  add_road: { ios: 'road.lanes.curved.left', android: 'add_road', web: 'add_road' },
  expand_more: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  view_agenda: { ios: 'rectangle.split.1x2', android: 'view_agenda', web: 'view_agenda' },
  grid_view: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' },
  link: { ios: 'link', android: 'link', web: 'link' },
  more_vert: { ios: 'ellipsis', android: 'more_vert', web: 'more_vert' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  content_copy: { ios: 'document.on.document', android: 'content_copy', web: 'content_copy' },
  calculate: { ios: 'function', android: 'calculate', web: 'calculate' },
  currency_rupee: { ios: 'indianrupeesign', android: 'currency_rupee', web: 'currency_rupee' },
  handshake: { ios: 'person.2.fill', android: 'handshake', web: 'handshake' },
  info: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  calendar_month: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  chat: { ios: 'bubble.left.and.bubble.right.fill', android: 'chat', web: 'chat' },
  account_balance: { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' },
  account_balance_wallet: { ios: 'wallet.pass.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' },
  sync_alt: { ios: 'arrow.left.arrow.right', android: 'sync_alt', web: 'sync_alt' },
  location_off: { ios: 'location.slash.fill', android: 'location_off', web: 'location_off' },
  location_on: { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  lock: { ios: 'lock.fill', android: 'lock', web: 'lock' },
  mail: { ios: 'envelope.fill', android: 'mail', web: 'mail' },
  moon: { ios: 'moon.fill', android: 'dark_mode', web: 'dark_mode' },
  mic: { ios: 'mic.fill', android: 'mic', web: 'mic' },
  pause: { ios: 'pause.fill', android: 'pause', web: 'pause' },
  play: { ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' },
  person: { ios: 'person.fill', android: 'person', web: 'person' },
  person_add: { ios: 'person.badge.plus', android: 'person_add', web: 'person_add' },
  photo_camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  phone: { ios: 'phone.fill', android: 'call', web: 'call' },
  open_in_new: { ios: 'arrow.up.right.square', android: 'open_in_new', web: 'open_in_new' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  smartphone: { ios: 'iphone', android: 'smartphone', web: 'smartphone' },
  laptop: { ios: 'laptopcomputer', android: 'laptop', web: 'laptop' },
  fingerprint: { ios: 'touchid', android: 'fingerprint', web: 'fingerprint' },
  tune: { ios: 'slider.horizontal.3', android: 'tune', web: 'tune' },
  notifications: { ios: 'bell.badge.fill', android: 'notifications_active', web: 'notifications_active' },
  timer: { ios: 'timer', android: 'timer', web: 'timer' },
  translate: { ios: 'character.bubble', android: 'translate', web: 'translate' },
  visibility_off: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  pause_circle: { ios: 'pause.circle.fill', android: 'pause_circle', web: 'pause_circle' },
  pending_actions: { ios: 'clock.arrow.circlepath', android: 'pending_actions', web: 'pending_actions' },
  real_estate_agent: { ios: 'house.fill', android: 'real_estate_agent', web: 'real_estate_agent' },
  restart_alt: { ios: 'arrow.counterclockwise', android: 'restart_alt', web: 'restart_alt' },
  remove: { ios: 'minus', android: 'remove', web: 'remove' },
  schedule: { ios: 'clock', android: 'schedule', web: 'schedule' },
  settings: { ios: 'gearshape.fill', android: 'settings', web: 'settings' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  straighten: { ios: 'ruler', android: 'straighten', web: 'straighten' },
  sun: { ios: 'sun.max.fill', android: 'sunny', web: 'sunny' },
  task_alt: { ios: 'checkmark.circle.fill', android: 'task_alt', web: 'task_alt' },
  verified: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
  verified_user: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
  upload_file: { ios: 'square.and.arrow.up', android: 'upload_file', web: 'upload_file' },
  visibility: { ios: 'eye', android: 'visibility', web: 'visibility' },
} as const satisfies Record<AppIconName, SymbolViewProps['name']>;

/** Platform symbol for native controls that render their own icon. */
export function getIosIconSymbol(name: AppIconName) {
  return SYMBOLS[name].ios;
}

export interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: ColorValue;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function AppIcon({ name, size = 20, color, accessibilityLabel, style }: AppIconProps) {
  return (
    <SymbolView
      name={SYMBOLS[name]}
      size={size}
      tintColor={color}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      style={style}
    />
  );
}
