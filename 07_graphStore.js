import "dotenv/config";
import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD),
);

async function runQuery(query, params = {}) {
  const session = driver.session();
  try {
    return await session.run(query, params);
  } finally {
    await session.close();
  }
}

/* ===============================
    MAIN ENTRY
================================ */

export async function syncChunksToGraph(chunks) {
  for (const chunk of chunks) {
    const { file, symbol, type, parentId, language, id } = chunk.metadata;

    // Always ensure Module exists first
    await createModuleNode(file, language);

    if (type === "function") {
      await createFunctionNode(symbol, file, id);

      const isTopLevel = !parentId || parentId === file;
      const parentLabel = isTopLevel ? "Module" : "Class";
      const targetParentId = isTopLevel ? file : parentId;

      if (parentLabel === "Class") {
        const className = parentId.split("#")[1];
        await createClassNode(className, file, parentId);
      }

      await linkToParent(id, targetParentId, parentLabel);
    }

    else if (type === "class") {
      await createClassNode(symbol, file, id);
      await linkToParent(id, file, "Module");
    }
  }
}

/* ===============================
    NODE CREATION
================================ */

async function createModuleNode(path, language) {
  await runQuery(
    `MERGE (m:Module {id: $path})
     SET m.path = $path, m.language = $language`,
    { path, language }
  );
}

async function createFunctionNode(name, file, uid) {
  await runQuery(
    `MERGE (f:Function {id: $uid})
     SET f.name = $name, f.file = $file`,
    { uid, name, file }
  );
}

async function createClassNode(name, file, uid) {
  await runQuery(
    `MERGE (c:Class {id: $uid})
     SET c.name = $name, c.file = $file`,
    { uid, name, file }
  );
}

/* ===============================
    RELATIONSHIPS
================================ */

// (Function)-[:DEFINED_IN]->(Class|Module)
// (Class)-[:DEFINED_IN]->(Module)
async function linkToParent(childId, parentId, parentType) {
  await runQuery(
    `MATCH (child {id: $childId})
     MATCH (parent:${parentType} {id: $parentId})
     MERGE (child)-[:DEFINED_IN]->(parent)`,
    { childId, parentId }
  );
}

// Module IMPORTS Module
export async function linkModuleImports(fromPath, toPath) {
  await runQuery(
    `MATCH (a:Module {id: $fromPath})
     MATCH (b:Module {id: $toPath})
     MERGE (a)-[:IMPORTS]->(b)`,
    { fromPath, toPath }
  );
}

// Function CALLS Function
export async function linkFunctionCalls(fromId, toId) {
  await runQuery(
    `MATCH (a:Function {id: $fromId})
     MATCH (b:Function {id: $toId})
     MERGE (a)-[:CALLS]->(b)`,
    { fromId, toId }
  );
}

/* ===============================
    GRAPH EXPANSION
================================ */

export async function expandSymbol(name, filePath) {
  const uid = `${filePath}#${name}`;

  const query = `
    MATCH (n {id: $uid})
    MATCH (n)-[:DEFINED_IN|CALLS*1..2]-(neighbor)
    RETURN neighbor.id AS id,
           head(labels(neighbor)) AS type,
           neighbor.name AS name
    LIMIT 10
  `;

  const result = await runQuery(query, { uid });

  return result.records.map(record => ({
    id: record.get("id"),
    type: record.get("type"),
    name: record.get("name") || record.get("id"),
  }));
}