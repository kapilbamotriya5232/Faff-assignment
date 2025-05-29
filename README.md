# 🚀 Faff Assignment (Final Round) 🚀

**Live Application:** [http://35.200.216.141/](http://35.200.216.141/)

**Author:** Kapil Bamotriya

---

## 📝 Project Overview

*(**TODO**: Add a brief overview of the Faff Assignment project here. You can get this from the main project link or your understanding of the assignment.)*

This repository contains the solution for the final round of the Faff Assignment. It showcases implementations for critical features including performance logging, robust load testing, realistic data generation, and an efficient search API.

---

## ✅ Task Completion Details

A comprehensive document detailing the successful completion of all assigned tasks can be found at the following link:

➡️ **[Faff Assignment - Task Completion Details](https://docs.google.com/document/d/1yaK2_hVDI6sQ7r015IyexSt-EyDf3evheLQMhh4p5TM/edit?usp=sharing)**

*(**TODO**: Briefly summarize the key achievements or methodologies for each task from the Google Doc if possible. If not, the link itself serves as an excellent detailed reference.)*

---

## ✨ Features & Implementation Highlights

### Task 1: Performance Logging & Monitoring 📊

* **APIPostMessageLatency Logging**:
    * **Implementation File**: `app/api/tasks/[taskId]/messages/route.ts`
    * **View Code on GitHub**: [kapilbamotriya5232/Faff-assignment/.../route.ts](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/app/api/tasks/%5BtaskId%5D/messages/route.ts)
    * *(**TODO**: Briefly describe how `APIPostMessageLatency` is calculated and logged based on your code in this file. E.g., "Measures the time taken from receiving a message post request to the point it's processed and a response is initiated, logged via [logging mechanism].")*
* **Event Loop & Event Loop Lag Logging**:
    * **Implementation File**: `server.js`
    * **View Code on GitHub**: [kapilbamotriya5232/Faff-assignment/blob/main/server.js](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/server.js)
    * *(**TODO**: Briefly describe how `eventLoop` metrics and `event_loop_lag` are monitored and logged based on your code in this file. E.g., "Utilizes Node.js's `perf_hooks` or a similar module to monitor event loop latency and logs these metrics to provide insights into server responsiveness.")*

---

### Task 2: System Load Simulation ⚙️

* **Load Simulation Script**:
    * **Script File**: `loadtest_socket_http.yml`
    * **View Script on GitHub**: [kapilbamotriya5232/Faff-assignment/blob/main/loadtest_socket_http.yml](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/loadtest_socket_http.yml)
    * *(**TODO**: Briefly describe the purpose and nature of the load simulation performed with this script. What were you testing? E.g., "This Artillery.io (or similar tool) script simulates a high volume of concurrent HTTP requests and WebSocket connections to rigorously test the application's stability, scalability, and performance under significant stress.")*

---

### Task 3: Data Management & Advanced Search API 🔍

* **Data Generation Scripts** (Modified from original versions):
    * **Populating Real Tasks**: `scripts/populate_real_tasks.ts`
        * **View Script on GitHub**: [kapilbamotriya5232/Faff-assignment/.../populate_real_tasks.ts](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/scripts/populate_real_tasks.ts)
        * *(**TODO**: Briefly describe what this script does, e.g., "Generates a dataset of realistic task entries, complete with varied attributes, to ensure the database mirrors real-world scenarios for testing and development.")*
    * **Populating Real Messages**: `scripts/populate_real_messages.ts`
        * **View Script on GitHub**: [kapilbamotriya5232/Faff-assignment/.../populate_real_messages.ts](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/scripts/populate_real_messages.ts)
        * *(**TODO**: Briefly describe what this script does, e.g., "Creates a substantial volume of message data, realistically associated with the generated tasks, to simulate active user communication.")*
    * **Generative AI API**: `app/api/generative-ai/route.ts`
        * **View Code on GitHub**: [kapilbamotriya5232/Faff-assignment/.../generative-ai/route.ts](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/app/api/generative-ai/route.ts)
        * *(**TODO**: Describe the functionality of this Generative AI API endpoint. E.g., "Provides an interface to a generative AI model, potentially for tasks like content creation, summarization, or automated responses within the application.")*
* **Search API Implementation**:
    * **Endpoint Logic**: `app/api/search-real-entities/route.ts`
    * **View Code on GitHub**: [kapilbamotriya5232/Faff-assignment/.../search-real-entities/route.ts](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/app/api/search-real-entities/route.ts)
    * *(**TODO**: Describe the search functionality. What entities can be searched? What kind of queries does it support? E.g., "Enables full-text search across tasks and messages, supporting keyword queries, and potentially filters for more refined results.")*
* **How to Test the Search API**:
    * Access the following URL in your browser or an API client (like Postman or Insomnia):
        ```
        [http://35.200.216.141/api/search-real-entities/?q=](http://35.200.216.141/api/search-real-entities/?q=)<ENTER-QUERY>
        ```
    * Replace `<ENTER-QUERY>` with your desired search term (e.g., `q=project update` or `q=urgent bug fix`).
