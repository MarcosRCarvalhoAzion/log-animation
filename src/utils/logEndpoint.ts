// Simple mock endpoint handler for receiving logs
export const setupLogEndpoint = () => {
  // Intercept fetch requests to /logs
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    
    // Handle POST requests to /logs
    if (url.includes('/logs') && init?.method === 'POST') {
      try {
        const logData = await (init.body as ReadableStream)?.getReader().read()
          .then(result => new TextDecoder().decode(result.value))
          || init.body?.toString()
          || '';

        // Dispatch custom event with log data
        window.dispatchEvent(new CustomEvent('newLogReceived', {
          detail: { logData }
        }));

        // Return success response
        return new Response(JSON.stringify({ status: 'success', message: 'Log received' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ status: 'error', message: 'Failed to parse log' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // For all other requests, use original fetch
    return originalFetch(input, init);
  };
};