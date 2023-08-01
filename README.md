# ExpressOpenAIChatProxy

This project is based on the code From Pawan Osman here. The original license
is copied below.
https://github.com/PawanOsman/ChatGPT

Acts as a proxy for OpenAI HTTP calls (and the python library) and directs to a set of Azure OpenAI Keys.

This Proxy
* only currently works for the /chat/completion part of OpenAI
* lets you specify multiple Azure keys
* randomly load balances all requests across those keys
* creates a semaphore for each key, so they only see one concurrent use
* caches responses in-memory for the 100 most recent calls

TODO - not yet implemented
* timeout logic for when Azure never response ... which happens
* configurable concurrency for the semaphore
* better emulation of OpenAI errors so that users get deeper information on why something didn't work, at present the errors are mostly obscured by the proxy.


### First add your keys and settings

Add your Azure keys to ```config.js```




### To run locally

setup a .env file that looks like this
```bash
export ELASTIC_APM_SERVICE_NAME=local-llm-proxy
export ELASTIC_APM_SECRET_TOKEN=<your key>
export ELASTIC_APM_SERVER_URL=<your apm server>
```

```bash
npm install
```

and then

```bash
bash runLocal.sh
```


### To run in docker

add your APM settings to runDocker.sh


```bash
bash build.sh
```

and then

```bash
bash runDocker.sh
```

### to test

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

