/**
 * Traverses AST recursively
 */
function traverse(node, callback) {
  callback(node);
  for (const child of node.children || []) {
    traverse(child, callback);
  }
}

/**
 * Extract symbols from AST
 * @param {Array<{path:string, content:string, language:string, ast:any}>} files
 * @returns {Array}
 */
export function extractSymbols(files) {
  return files.map(file => {
    const functions = [];
    const classes = [];
    const imports = [];
    const calls = [];

    if (!file.ast) {
      return { ...file, symbols: { functions, classes, imports, calls } };
    }

    traverse(file.ast.rootNode, node => {
      // JS / TS function declarations
      if (node.type === "function_declaration") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) functions.push(nameNode.text);
      }

      // JS / TS class declarations
      if (node.type === "class_declaration") {
        const nameNode = node.childForFieldName("name");
        if (nameNode) classes.push(nameNode.text);
      }

      // Import statements
      if (node.type === "import_statement") {
        imports.push(node.text);
      }

      // Function calls
      if (node.type === "call_expression") {
        const fnNode = node.child(0);
        if (fnNode && !calls.includes(fnNode.text)) calls.push(fnNode.text);
      }
    });

    return {
      ...file,
      symbols: { functions, classes, imports, calls },
    };
  });
}
