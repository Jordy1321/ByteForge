document.onload = function() {
    fetch('/status')
        .then(response => response.json())
        .then(data => {
            document.getElementById('byteAmount').innerText = data.byteValue;
        })
        .catch(error => {
            console.error('Error fetching status:', error);
        });
}

document.getElementById('byteButton').onClick = function() {
    //send a get request to the server
    fetch('/byte')
        .then(response => response.json())
        .then(data => {
            // Update the UI with the received data
            document.getElementById('byteOutput').innerText = data.byteValue;
        })
        .catch(error => {
            console.error('Error fetching byte data:', error);
        });
}