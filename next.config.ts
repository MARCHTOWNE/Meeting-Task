import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // 首页直接跳到任务页。在配置里做重定向，请求不会进入页面渲染，
  // 避免开发模式预渲染检查把 redirect() 当成错误打印出来
  async redirects() {
    return [{ source: "/", destination: "/tasks", permanent: false }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
