// lib/embedding.js
import { pipeline, env } from '@xenova/transformers';

// Configure a cache directory for model downloads.
// This is where the library will store the downloaded model files.
// Make sure this path is writable by your application process.
// Using './.cache/transformers' places it in your project's .cache directory.
env.cacheDir = './.cache/transformers';

// Allow loading of local models (important for some setups and model types)
env.allowLocalModels = true;

// To avoid re-initializing the pipeline on every call, we use a singleton pattern.
let embedderInstance = null;

async function getEmbedder() {
  if (!embedderInstance) {
    console.log('Initializing embedding model...');
    // 'feature-extraction' is the pipeline task for getting embeddings.
    // 'Xenova/all-MiniLM-L6-v2' is a good, lightweight sentence transformer model.
    embedderInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // Use a quantized (smaller, often faster) version of the model.
                       // Set to false for the full-precision model if needed, but quantized is usually fine.
    });
    console.log('Embedding model initialized.');
  }
  return embedderInstance;
}

export async function generateEmbedding(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.warn('generateEmbedding called with invalid text:', text);
    return null; // Or throw an error, depending on desired handling
  }

  try {
    const embedder = await getEmbedder();
    // The 'pooling: 'mean'' strategy averages token embeddings to get a sentence embedding.
    // 'normalize: true' ensures the output embeddings are unit vectors (length 1),
    // which is often preferred for cosine similarity calculations.
    const output = await embedder(text, { pooling: 'mean', normalize: true });

    // The actual embedding data is in output.data (a Float32Array)
    // Convert it to a standard JavaScript array of numbers.
    return Array.from(output.data);
  } catch (error) {
    console.error('Error generating embedding for text:', text, error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// Optional: Function to "warm up" the model when the server starts.
// Call this in your server's initialization logic if you want to avoid
// the delay of loading the model on the first API request.
export async function warmupEmbeddingModel() {
  console.log('Warming up embedding model...');
  await getEmbedder();
  console.log('Embedding model is warm.');
}