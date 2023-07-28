
To run locally

Add your Azure keys to ```config.js```


```bash
npm install
```

and then

```bash
npm start
```

use the api by sending queries to

```
http://localhost:3000/v1/chat/completions
```


here's a curl example

```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fake" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "Hello!"
      }
    ]
  }'

```


here is a python example

```python
import openai

proxy = "http://localhost:3000/v1"

openai.default_model = "gpt-3.5-turbo"
openai.api_key = "not-real" ## you have to submit something
openai.api_base = proxy


try:

    prompt = "hello"  # Replace this with your actual prompt
    completion = openai.ChatCompletion.create(
        model=openai.default_model,
        messages=[
            {"role": "system", "content": "you are a pirate"},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )
    print(completion)

except openai.error.OpenAIError as e:
    # If the error is from the OpenAI API, you can print the response details
    print("An OpenAI API error occurred:")
    print("Status code:", e.http_status)
    print("Error message:", e.message)
    print("Request ID:", e.request_id)
    print("Error details:", e.response_data)
except Exception as e:
    # Handle other unexpected exceptions
    print("An error occurred:", str(e))
```

