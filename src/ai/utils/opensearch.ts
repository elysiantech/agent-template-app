import { OpenSearchVectorStore } from "@langchain/community/vectorstores/opensearch";
import { Client as OpenSearchServerlessClient } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { GoogleVertexAIMultimodalEmbeddings } from "@langchain/community/experimental/multimodal_embeddings/googlevertexai";
import { Document } from "@langchain/core/documents";

const AWS_REGION = process.env.AWS_REGION!;
const OS_ENDPOINT = process.env.OS_ENDPOINT!;
const VECTOR_INDEX = "video-vectors";
const GOOGLE_CREDENTIALS = process.env.GOOGLE_VERTEX_AI_WEB_CREDENTIALS!;

export const osClient = new OpenSearchServerlessClient({
  ...AwsSigv4Signer({
    region: AWS_REGION,
    service: 'aoss',
    getCredentials: () =>
      new Promise((resolve, reject) => resolve({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      }))
  }),
  node: OS_ENDPOINT,
});

const credentials = JSON.parse(GOOGLE_CREDENTIALS)
credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
const embeddings = new GoogleVertexAIMultimodalEmbeddings({
  authOptions: { projectId: credentials.project_id, credentials },
});

export const vectorStore = new OpenSearchVectorStore(embeddings, {
  client: osClient,
  service: "aoss",
  indexName: VECTOR_INDEX,
});

async function getIndexMapping(indexName: string) {
  try {
    const response = await osClient.indices.getMapping({ index: indexName });
    console.log("Index Mapping:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Error fetching index mapping:", error);
  }
}
export async function indexDocuments(documents: Document[], buffers?: Buffer[]) {
  if (documents.length === 0) return;
  if (buffers && buffers?.length === documents.length){
    const vectors = await embeddings.embedImage(buffers);
    await vectorStore.addVectors(vectors, documents);
  } else {
    await vectorStore.addDocuments(documents);
  }
}

export async function searchDocuments(
  assetId: string,
  options: {
    filters?: Record<string, any>,
    numberOfResults?:number,
    queryText?: string 
}
) {
  const { filters={}, numberOfResults=10, queryText } = options;
  const structuredFilters: any[] = [{ term: { "metadata.assetId": assetId } }]; // Always filter by assetId
  // Apply additional filters (term or range)
  for (const [key, value] of Object.entries(filters)) {
    if (typeof value === "object" && (value.gte || value.lte)) {
      structuredFilters.push({ range: { [`metadata.${key}`]: value } });
    } else {
      structuredFilters.push({ term: { [`metadata.${key}`]: value } });
    }
  }

  let queryBody: any = {
    index: VECTOR_INDEX,
    body: {
      query: {
        bool: {
          filter: structuredFilters 
        }
      },
      size: numberOfResults
    }
  };

  if (queryText) {
    try {
      // Generate vector embedding for the search query using LangChain
      const queryVector = await embeddings.embedQuery(queryText);

      // Semantic search with k-NN retrieval
      queryBody.body.query.bool.must = [
        {
          knn: {
            embedding: { // Use "embedding" as vector field name
              vector: queryVector,
              k: numberOfResults
            }
          }
        }
      ];
    } catch (error) {
      console.error("Error generating query embedding:", error);
      return [];
    }
  } 

  try {
    const response = await osClient.search(queryBody);
    const hits = (response as any)?.body?.hits?.hits ?? [];
    return hits.map((hit: any) => hit._source);
  } catch (error) {
    console.error("Error searching documents:", error);
    return [];
  }
}


export async function deleteByQuery(query:any){
  try {
  const searchResponse = await osClient.search({
    index: VECTOR_INDEX,
    body: {
      size: 1000,
      query
    },
  });
  const hits = (searchResponse as any)?.body?.hits?.hits ?? [];
    const ids = hits.map((hit: any) => hit._id);
    await Promise.all(ids.map((id:any) => osClient.delete({index:VECTOR_INDEX, id})))
  } catch (error) {
    console.error("Error deleting documents:", error);
  }
}


export async function deleteDocuments(assetId: string,) {
  try {
    const filters: any[] = [{ term: { "metadata.assetId": assetId } }]; 
    const searchBody = {
      size: 1000,
      query: {
        bool: {
          filter: filters,
        },
      },
    };
    const searchResponse = await osClient.search({
      index: VECTOR_INDEX,
      body: searchBody,
    });
    const hits = (searchResponse as any)?.body?.hits?.hits ?? [];
    const ids = hits.map((hit: any) => hit._id);
    await Promise.all(ids.map((id:any) => osClient.delete({index:VECTOR_INDEX, id})))
    console.log(`Deleted documents with assetId: ${assetId}`);
  } catch (error) {
    console.error("Error deleting documents:", error);
  }
}

