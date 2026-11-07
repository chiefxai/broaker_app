import { NativeTabs } from 'expo-router/native-tabs';

import { getIosIconSymbol } from '@/components/core/icons';
import { useLanguage } from '@/i18n/language-provider';

export default function NativeTabLayout() {
  const { t } = useLanguage();
  return (
    <NativeTabs minimizeBehavior="onScrollDown" disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={getIosIconSymbol('dashboard')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('properties')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={getIosIconSymbol('real_estate_agent')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="shared-links" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('sharedLinks')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={getIosIconSymbol('link')} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('settings')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={getIosIconSymbol('settings')} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
