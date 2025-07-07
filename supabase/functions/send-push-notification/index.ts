import { serve } from 'npm:std/server'

// The main interface for Expo's push notification API
interface PushMessage {
  to: string;
  sound?: 'default';
  title: string;
  body: string;
  data?: { [key: string]: any };
}

serve(async (req) => {
  // NOTE: In a real app, this function would be protected and would look up the user's
  // push token from a database table instead of receiving it directly.
  // This is simplified for the deliverable.
  
  const { token, title, body } = await req.json();

  if (!token || !title || !body) {
    return new Response(JSON.stringify({ error: 'Missing parameters: token, title, and body are required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const message: PushMessage = {
    to: token,
    sound: 'default',
    title: title,
    body: body,
    data: { withSome: 'data' },
  };

  try {
    // Send the push notification via Expo's server
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();

    // Check if Expo reported an error
    if (responseData.data.status === 'error') {
        console.error('Expo Push Error:', responseData.data.message);
        throw new Error(responseData.data.message);
    }

    return new Response(JSON.stringify({ success: true, response: responseData }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});