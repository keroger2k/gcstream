document.addEventListener('DOMContentLoaded', () => {
    const submitButton = document.getElementById('submitToken');
    const refreshTokenInput = document.getElementById('refreshToken');
    const resultDiv = document.getElementById('result');
    const loader = document.getElementById('loader');

    const PROXY_API_URL = 'http://localhost:3000/api/refresh-token'; // URL of our Node.js proxy

    // Function to handle copying text to clipboard
    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = 'Copied!';
            buttonElement.classList.add('copied');
            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            // Fallback or error message can be handled here
            const originalText = buttonElement.textContent;
            buttonElement.textContent = 'Failed!';
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 2000);
        });
    }

    submitButton.addEventListener('click', async () => {
        const userRefreshToken = refreshTokenInput.value.trim();
        resultDiv.innerHTML = ''; // Clear previous results
        loader.style.display = 'block'; // Show loader

        if (!userRefreshToken) {
            resultDiv.innerHTML = '<p style="color: red;">Please paste your refresh token.</p>';
            loader.style.display = 'none'; // Hide loader
            return;
        }

        try {
            console.log("Sending to proxy:", PROXY_API_URL);
            console.log("Token being sent:", userRefreshToken.substring(0,20) + "...");

            const response = await fetch(PROXY_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken: userRefreshToken })
            });

            const responseBodyText = await response.text(); // Get raw text first for better error diagnosis
            let data;

            try {
                data = JSON.parse(responseBodyText);
            } catch (e) {
                // If parsing fails, the response might not be JSON.
                console.error('Failed to parse response from proxy as JSON:', responseBodyText);
                throw new Error(`Proxy did not return valid JSON. Status: ${response.status}. Body: ${responseBodyText.substring(0,100)}...`);
            }

            if (!response.ok) {
                // Error came from our proxy or was forwarded from GC API
                console.error('Error from proxy/API:', data);
                 const errorMessage = data.error ?
                                      (data.details ? `${data.error} - ${data.details}` : data.error) :
                                      (responseBodyText || `Request failed with status ${response.status}`);
                throw new Error(errorMessage);
            }

            // Assuming successful response structure from GC API via proxy:
            // { access: { data: "...", expires: ... }, refresh: { data: "...", expires: ... } }
            if (data && data.access && data.access.data && data.refresh && data.refresh.data) {
                const accessToken = data.access.data;
                const newRefreshToken = data.refresh.data;

                resultDiv.innerHTML = `
                    <p>
                        <strong>Access Token:</strong>
                        <button class="copy-button" data-token="${accessToken}">Copy</button>
                    </p>
                    <p style="word-break: break-all;">${accessToken}</p>
                    <br>
                    <p>
                        <strong>New Refresh Token:</strong>
                        <button class="copy-button" data-token="${newRefreshToken}">Copy</button>
                    </p>
                    <p style="word-break: break-all;">${newRefreshToken}</p>
                `;

                // Add event listeners to new copy buttons
                resultDiv.querySelectorAll('.copy-button').forEach(button => {
                    button.addEventListener('click', (e) => {
                        copyToClipboard(e.target.dataset.token, e.target);
                    });
                });

            } else {
                console.error("Unexpected response structure:", data);
                throw new Error("Received an unexpected response structure from the API.");
            }

        } catch (error) {
            console.error('Error refreshing token:', error);
            resultDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        } finally {
            loader.style.display = 'none'; // Hide loader
        }
    });
});
