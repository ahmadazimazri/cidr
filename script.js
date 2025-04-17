document.getElementById('calculateButton').addEventListener('click', calculateCidr);
document.getElementById('cidrInput').addEventListener('keypress', function(event) {
    // Allow calculation on Enter key press
    if (event.key === 'Enter') {
        calculateCidr();
    }
});

function calculateCidr() {
    const cidrInput = document.getElementById('cidrInput').value.trim();
    const resultsDiv = document.getElementById('results');
    const errorDiv = document.getElementById('errorDisplay');

    // Clear previous results and errors
    resultsDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    // --- Input Validation ---
    const cidrPattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/;
    const match = cidrInput.match(cidrPattern);

    if (!match) {
        showError("Invalid CIDR format. Use format: xxx.xxx.xxx.xxx/yy");
        return;
    }

    const ipStr = match[1];
    const prefix = parseInt(match[2], 10);

    if (prefix < 0 || prefix > 32) {
        showError("Invalid prefix length. Must be between 0 and 32.");
        return;
    }

    const ipParts = ipStr.split('.').map(part => parseInt(part, 10));
    if (ipParts.length !== 4 || ipParts.some(part => isNaN(part) || part < 0 || part > 255)) {
        showError("Invalid IP address part. Octets must be between 0 and 255.");
        return;
    }

    // --- Calculations ---
    try {
        const ipInt = ipToInt(ipStr);

        // Calculate Subnet Mask
        // Create a 32-bit integer with 'prefix' number of leading 1s
        // Handle prefix 0 case separately as bitwise shifts of 32 are problematic
        const maskInt = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF;
        const subnetMask = intToIp(maskInt);

        // Calculate Network Address
        const networkInt = (ipInt & maskInt) >>> 0; // Use unsigned right shift
        const networkAddress = intToIp(networkInt);

        // Calculate Broadcast Address
        // Invert the mask bits and OR with the network address
        const broadcastInt = (networkInt | (~maskInt & 0xFFFFFFFF)) >>> 0;
        const broadcastAddress = intToIp(broadcastInt);

        // Calculate Number of Addresses and Hosts
        const totalAddresses = Math.pow(2, 32 - prefix);
        let usableHosts = 0;
        if (prefix <= 30) {
             usableHosts = totalAddresses - 2;
        } else if (prefix === 31) {
            // /31 is special case often for point-to-point, 0 usable hosts by old convention
            usableHosts = 0; // Or sometimes considered 2, depending on context
        } else { // prefix === 32
            usableHosts = 0; // Only 1 address, the host itself, 0 *usable* in network sense
        }


        // Calculate First and Last Usable Host Addresses
        let firstHost = "N/A";
        let lastHost = "N/A";
        if (prefix <= 30) {
            const firstHostInt = networkInt + 1;
            const lastHostInt = broadcastInt - 1;
            firstHost = intToIp(firstHostInt);
            lastHost = intToIp(lastHostInt);
        } else if (prefix === 31) {
            // Technically no "usable" range in classic sense
             firstHost = intToIp(networkInt); // Often the two IPs are used directly
             lastHost = intToIp(broadcastInt);
        }


        // --- Display Results ---
        document.getElementById('resultCidr').textContent = `${networkAddress}/${prefix}`; // Display calculated network address
        document.getElementById('networkAddress').textContent = networkAddress;
        document.getElementById('subnetMask').textContent = subnetMask;
        document.getElementById('firstHost').textContent = firstHost;
        document.getElementById('lastHost').textContent = lastHost;
        document.getElementById('broadcastAddress').textContent = broadcastAddress;
        document.getElementById('totalAddresses').textContent = totalAddresses.toLocaleString();
        document.getElementById('usableHosts').textContent = usableHosts >= 0 ? usableHosts.toLocaleString() : '0'; // Ensure non-negative display

        resultsDiv.style.display = 'block';

    } catch (e) {
        console.error("Calculation error:", e);
        showError("An error occurred during calculation.");
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorDisplay');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    document.getElementById('results').style.display = 'none';
}

// --- Helper Functions ---

function ipToInt(ipStr) {
    // Converts "192.168.1.1" to a 32-bit integer
    return ipStr.split('.').reduce((res, octet) => (res << 8) | parseInt(octet, 10), 0);
}

function intToIp(ipInt) {
    // Converts a 32-bit integer back to "192.168.1.1" format
    // Use unsigned right shift (>>>) to handle potential negative representation of large IPs
    return [
        (ipInt >>> 24) & 255,
        (ipInt >>> 16) & 255,
        (ipInt >>> 8) & 255,
        ipInt & 255
    ].join('.');
}
