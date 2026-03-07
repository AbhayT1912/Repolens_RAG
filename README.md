# GraphRAG Codebase Analysis System

## Overview

This project implements a GraphRAG (Graph-Augmented Retrieval) system designed for deep codebase analysis. By combining semantic vector search with a Knowledge Graph, the system can retrieve not only relevant code snippets but also the architectural context, such as where a function is defined, what classes it belongs to, and how modules interact.

## Architecture

The system utilizes a hybrid storage approach to bridge the gap between raw text and structural relationships:

- **Vector Database (Pinecone):** Stores code embeddings for semantic similarity search.
- **Graph Database (Neo4j):** Stores the structural lineage and relationships between code entities.
- **LLM (Gemini 2.5 Flash):** Processes the augmented context to provide precise, technically grounded answers.

## Project Structure

- **05_chunkBuilder.js**: Handles the parsing and chunking of source code files into searchable units.
- **06_vectorStore.js**: Manages the embedding process and upserting of data into the vector index.
- **07_graphStore.js**: Manages the Neo4j schema, including the creation of Module, Class, and Function nodes and their respective relationships.
- **08_queryEngine.js**: The orchestration layer that performs semantic search and then expands the found nodes within the graph to collect architectural context.
- **09_llmResponder.js**: Formats the final consolidated context and interfaces with the Gemini API for response generation.

## Graph Schema

The system builds a relationship map using the following logic:

- **DEFINED_IN**: Links Functions to Classes or Modules, and Classes to Modules.
- **CALLS**: Represents function-to-function execution paths.
- **IMPORTS**: Tracks dependencies between different Modules.

## Getting Started

### Prerequisites

- Node.js (v20.6.0 or higher for native env support)
- Neo4j Instance (Aura or Local)
- Pinecone API Key
- Google Gemini API Key

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure your environment variables in a `.env` file:
    ```env
    PINECONE_API_KEY=your_key
    NEO4J_URI=your_uri
    NEO4J_USERNAME=neo4j
    NEO4J_PASSWORD=your_password
    GEMINI_API_KEY=your_key
    PINECONE_INDEX=your_index_name
    ```

### Usage

To ingest your codebase into the databases:

```bash
npm run upload
```

To ask queries to the model, run:

```bash
npm run ask
```
