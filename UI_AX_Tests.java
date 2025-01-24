import os
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains

# Path to the axe-core JavaScript file (download it from https://github.com/dequelabs/axe-core)
AXE_SCRIPT_PATH = "path/to/axe.min.js"

# Set up Selenium WebDriver
driver = webdriver.Chrome()  # Use ChromeDriver; replace with appropriate driver for other browsers
driver.maximize_window()

# Base URL of the web application
BASE_URL = "https://example.com"

# List to store visited pages
visited_pages = set()

# Accessibility scan function
def run_axe_analysis(url):
    """Inject axe-core and run accessibility analysis on the given URL."""
    print(f"Scanning {url}...")
    # Navigate to the page
    driver.get(url)
    time.sleep(2)  # Allow time for the page to load completely

    # Inject axe-core into the page
    with open(AXE_SCRIPT_PATH, "r") as axe_script:
        driver.execute_script(axe_script.read())

    # Run the accessibility analysis
    results = driver.execute_script("return axe.run();")
    
    # Save the results to a JSON file
    output_file = f"axe_report_{url.replace('https://', '').replace('/', '_')}.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=4)
    
    print(f"Accessibility report saved to: {output_file}")

# Crawl all internal links
def crawl_links(url):
    """Recursively crawl all internal links and run accessibility scans."""
    if url in visited_pages or not url.startswith(BASE_URL):
        return
    visited_pages.add(url)

    try:
        driver.get(url)
        time.sleep(2)  # Allow time for the page to load

        # Run accessibility analysis on the current page
        run_axe_analysis(url)

        # Find all internal links on the page
        links = driver.find_elements(By.TAG_NAME, "a")
        for link in links:
            href = link.get_attribute("href")
            if href and href.startswith(BASE_URL):
                crawl_links(href)
    except Exception as e:
        print(f"Error while processing {url}: {e}")

# Start crawling and analyzing
try:
    crawl_links(BASE_URL)
finally:
    driver.quit()
    print("Accessibility testing completed!")
