// Array of quotes (each quote has text + category)
let quotes = [
    { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Inspiration" },
    { text: "Don’t let yesterday take up too much of today.", category: "Wisdom" }
];

// Function to show a random quote
function showRandomQuote() {
    const quoteDisplay = document.getElementById("quoteDisplay");

  // Pick a random quote
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const randomQuote = quotes[randomIndex];

  // Clear old content
    quoteDisplay.innerHTML = "";

  // Create quote text element
    const quoteText = document.createElement("p");
    quoteText.textContent = `"${randomQuote.text}"`;

  // Create category element
    const quoteCategory = document.createElement("small");
    quoteCategory.textContent = `— ${randomQuote.category}`;

  // Add to DOM
    quoteDisplay.appendChild(quoteText);
    quoteDisplay.appendChild(quoteCategory);
}

// Function to add a new quote
function addQuote() {
    const newQuoteText = document.getElementById("newQuoteText").value.trim();
    const newQuoteCategory = document.getElementById("newQuoteCategory").value.trim();

  // Validation: make sure fields are not empty
    if (newQuoteText === "" || newQuoteCategory === "") {
    alert("Please enter both a quote and a category.");
    return;
}

  // Add new quote to array
quotes.push({ text: newQuoteText, category: newQuoteCategory });

  // Clear input fields
document.getElementById("newQuoteText").value = "";
document.getElementById("newQuoteCategory").value = "";

alert("New quote added successfully!");
}

// Event listener for "Show New Quote" button
document.getElementById("newQuote").addEventListener("click", showRandomQuote);

// Show an initial quote when the page loads
document.addEventListener("DOMContentLoaded", showRandomQuote);