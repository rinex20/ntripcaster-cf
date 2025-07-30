// src/index.js (最终修正版)

// 第一步：从它的文件中导入 NtripCaster 类
import { NtripCaster } from './NtripCaster.js';

// 第二步：将 NtripCaster 类导出，以便 wrangler 和 Cloudflare 平台能够发现它
export { NtripCaster };

// 第三步：保持我们原有的 fetch 处理器逻辑不变
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname.slice(1);

      if (!path) {
        return new Response('请在 URL 路径中指定一个挂载点 (e.g., /MOUNTPOINT)', { status: 400 });
      }

      if (!env.NTRIP_CASTER) {
          return new Response('Durable Object "NTRIP_CASTER" 未绑定。请在 Cloudflare 仪表盘中配置。', { status: 500 });
      }

      const id = env.NTRIP_CASTER.idFromName(path);
      const stub = env.NTRIP_CASTER.get(id);

      return await stub.fetch(request);
    } catch (e) {
      console.error(e);
      return new Response(e.stack, { status: 500 });
    }
  },
};
