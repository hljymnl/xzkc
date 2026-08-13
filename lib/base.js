// GitHub Pages 子路径部署：所有静态资源路径前缀
export const BASE = '/xiaozu-kecheng';
export const asset = (p) => (p.startsWith(BASE) ? p : BASE + p);
