import postcss from "postcss";
import valueParser from "postcss-value-parser";
/** Remove resource-valued functions before assigning CSS to an isolated preview. */
function offlineValue(value: string): string {
  const tree = valueParser(value);
  function local(nodes: valueParser.Node[]): valueParser.Node[] {
    return nodes.map((n) =>
      n.type === "function" &&
      /^(?:url|image|image-set|-webkit-image-set|paint)$/i.test(n.value)
        ? {
            type: "word",
            value: "none",
            sourceIndex: n.sourceIndex,
            sourceEndIndex: n.sourceEndIndex,
          }
        : n.type === "function"
          ? { ...n, nodes: local(n.nodes) }
          : n,
    );
  }
  tree.nodes = local(tree.nodes);
  return tree.toString();
}
export function offlineCss(css: string): string {
  try {
    const root = postcss.parse(css);
    root.walkAtRules((rule) => {
      if (/^(?:import|charset|namespace)$/i.test(rule.name)) rule.remove();
    });
    root.walkDecls((d) => {
      d.value = offlineValue(d.value);
    });
    return root.toString();
  } catch {
    return "";
  }
}
export function offlinePreview(css: string, html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  // A template is inert. Strip resource and active-content elements before serialization.
  template.content
    .querySelectorAll(
      "script,style,link,base,meta,iframe,frame,object,embed,img,picture,video,audio,source,track,image,foreignObject",
    )
    .forEach((n) => n.remove());
  for (const el of template.content.querySelectorAll("*")) {
    for (const attr of [...el.attributes]) {
      if (
        /^(?:on|src|href|xlink:href|poster|background|data$|action$|formaction$)/i.test(
          attr.name,
        )
      )
        el.removeAttribute(attr.name);
      else if (attr.name.toLowerCase() === "style")
        el.setAttribute("style", offlineValue(attr.value));
    }
  }
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src 'none'; img-src 'none'; form-action 'none'; base-uri 'none'"><style>${offlineCss(css).replace(/</g, "\\3c ")}</style>${template.innerHTML}`;
}
