// Inside the SendPage component...
const transferMutation = useMutation<TransferResult, Error, { /* ... */ }>({
  mutationFn: async (params) => {
      // --- THIS IS THE NEW LOGIC ---
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch('/api/secure-transfer-v2', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(params),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      return result;
  },
  // ... onSuccess and onError handlers remain the same ...
});