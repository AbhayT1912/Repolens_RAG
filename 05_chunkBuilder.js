/**
 * Build semantic chunks from AST
 * @param {Array<{path:string, content:string, language:string, ast:any}>} files
 * @returns {Array<{text:string, metadata:Object}>}
 */
export function buildChunks(files) {
  const chunks = [];

  for (const file of files) {
    if (!file.ast || !file.ast.rootNode) {
      continue;
    }

    const fileChunks = [];
    const queue = [{ node: file.ast.rootNode, parentId: file.path }];

    while (queue.length > 0) {
      const { node, parentId } = queue.shift();
      const type = node.type;
      let isChunked = false;

      const isFunction = [
        "function_declaration",
        "function_definition",
        "method_definition",
        "function_expression",
        "arrow_function",
        "generator_function",
        "async_function",
        "async_arrow_function",
        "async_generator_function",
        "function_type",
        "variable_declaration", // Capture top-level variables as potential symbols
      ].includes(type);
      const isClass = ["class_declaration", "class_definition"].includes(type);

      if (isClass || isFunction) {
        const nameNode = node.childForFieldName("name");
        const symbol = nameNode ? nameNode.text : "anonymous";
        const currentId = `${file.path}#${symbol}`;

        fileChunks.push({
          text: file.content.slice(node.startIndex, node.endIndex),
          metadata: {
            id: currentId,
            parentId: parentId,
            file: file.path,
            symbol: symbol,
            type: isClass ? "class" : "function",
            language: file.language,
          },
        });
        isChunked = true;
      }

      if (!isChunked) {
        for (const child of node.namedChildren || []) {
          queue.push({ node: child, parentId: parentId });
        }
      }
    }

    // If no functions or classes were found
    // capture the whole content as a 'module' type.
    if (fileChunks.length === 0) {
      chunks.push({
        text: file.content,
        metadata: {
          id: `${file.path}#module`,
          parentId: null,
          file: file.path,
          symbol: "main",
          type: "module",
          language: file.language,
        },
      });
    } else {
      chunks.push(...fileChunks);
    }
  }

  return chunks;
}
