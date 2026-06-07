const { expect } = require('@playwright/test')

async function handleResponse(request, response) {
  const status = response.status()

  if (status >= 500) {
    console.error(`Server error: ${status} for ${request.url()}`)
  }

  return status < 500
}

module.exports = { handleResponse }
