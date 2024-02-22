import fs from "node:fs"
import prettier from "prettier"
import { RouterBuilderConfig, ImportOption } from "./types";
import { FileInfoItem } from "./types/filesInfo";
import { conveyFunction } from "./utils/conveyFunction";
import { depImportCode, importCode } from "./utils/importCode";
import { rootPath } from "./utils/rootPath";
import { dataType } from "./utils/dataType";

// 读取文件 <router></router>
export function getRouterConfig(content: string) {
  const matches: string[] = [];
  let match;
  // 正则匹配 <router></router> 标签名称
  const reg: RegExp = /<router>([\s\S]*?)<\/router>/g;
  // 可能匹配到多个 循环处理保存起来
  while ((match = reg.exec(content)) !== null) {
    matches.push(match[1]);
  }
  if (matches.length) {
    // 利用 eval 函数，将配置对象放入一个立即执行函数当中并且返回，就能快速将字符串转成一个对象
    const params = matches.map((match) =>
      eval(`(function(){return {${match}}})()`)
    );
    return params
  }
  return null;
}

// 生成路由配置对象
// routerConfig 多个路由信息
// defaultRouter 默认的路由信息
// imports 导入依赖
// dictInfo 当前文件夹信息
// dictList 子文件夹/子文件
export async function generateRouterConfig(
  routerConfig: any,
  defaultRouter: any,
  imports: ImportOption,
  dictInfo: FileInfoItem,
  config: RouterBuilderConfig
) {
  let router = null;

  if (routerConfig) {
    router = [];
    for (const item of routerConfig) {
      // 对函数进行处理转换
      conveyFunction(item);

      // // 判断import对象
      // if (dataType(item.import) === 'object') {
      //   // 处理import对象
      //   depImportCode(item.import, imports)
      //   // 删除 import 属性
      //   delete item.import
      // }

      const webpackChunkName = item.webpackChunkName
      // 如果存在 webpackChunkName 字段，保存然后移除
      item.webpackChunkName && delete item.webpackChunkName

      router.push({
        ...defaultRouter,
        ...item,
        component: importCode(dictInfo.names, dictInfo.name, config, webpackChunkName),
      });
    }
  }
  return router;
};

// 生成 router 文件
export async function generateRouterFile(route: string, imports: string, moduleImports: string, config: RouterBuilderConfig) {
  // 解析输出路径
  const paths: string[] = config.output.split("/").filter((item) => Boolean(item));
  const fileName: string = paths.pop() as string; // 先保存文件名称
  let fullPath = rootPath;
  for (const p of paths) {
    // 遍历路径
    fullPath += `//${p}`;
    try {
      // 判断是否存在文件夹
      await fs.promises.access(fullPath);
    } catch (err) {
      // 不存在则创建文件夹
      await fs.promises.mkdir(fullPath);
    }
  }
  // 通过 writeFile 方法将最终结果写入到对应路径的文件当中
  route = route.replace(/\\n/g, '\n');
  const res = await prettier.format(generateRouterTemplate(route, imports, moduleImports), { parser: 'babel' });
  fs.promises.writeFile(
    `${fullPath}//${fileName}`,
    res
  );
};

function generateRouterTemplate(router: string, imports: string, moduleImports: string): string {
  return `
${moduleImports}
${imports}
export default ${router}  
`
};