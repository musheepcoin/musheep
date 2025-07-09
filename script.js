// No active script needed for this design, but keeping the file for future additions.
// The animations are handled by CSS.
console.log("Welcome to Musheep!");

const copyButton = document.getElementById('copy-ca-button');
const caText = document.getElementById('ca-text').innerText;
const copyFeedback = document.getElementById('copy-feedback');

copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(caText).then(() => {
        copyFeedback.classList.add('show');
        setTimeout(() => {
            copyFeedback.classList.remove('show');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
});