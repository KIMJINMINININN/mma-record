import { Linking } from 'react-native';
import { MessageHandler } from '../types';

export const systemHandlers: Record<string, MessageHandler> = {
  'App Launch': async (_, ctx) => {
    // 앱 최초 실행 시 웹뷰에 알림
    ctx.sendToWebview({ mode: 'First App Launch' });
  },

  'Open External Link': async (data, _ctx) => {
    // 외부 링크 열기
    if (data?.url) {
      await Linking.openURL(data.url);
    }
  },
};
