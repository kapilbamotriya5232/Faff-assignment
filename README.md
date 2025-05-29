# 🚀 Faff Assignment (Final Round) 🚀

**Live Application:** [http://35.200.216.141/](http://35.200.216.141/)

**Author:** Kapil Bamotriya

---

## 📝 Project Overview



This repository contains the solution for the final round of the Faff Assignment. It showcases implementations for critical features including performance logging, robust load testing, realistic data generation, and an efficient search API.

---

## ✅ Task Completion Details

A comprehensive document detailing the successful completion of all assigned tasks can be found at the following link:

➡️ **[Faff Assignment - Task Completion Details](https://docs.google.com/document/d/1yaK2_hVDI6sQ7r015IyexSt-EyDf3evheLQMhh4p5TM/edit?usp=sharing)**


---

## ✨ Features & Implementation Highlights

### Task 1: Performance Logging & Monitoring 📊

* **APIPostMessageLatency Logging**:
    * **Implementation File**: `app/api/tasks/[taskId]/messages/route.ts`
    * **View Code on GitHub**: [kapilbamotriya5232/Faff-assignment/.../route.ts](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/app/api/tasks/%5BtaskId%5D/messages/route.ts)

* **Event Loop & Event Loop Lag Logging**:
    * **Implementation File**: `server.js`
    * **View Code on GitHub**: [kapilbamotriya5232/Faff-assignment/blob/main/server.js](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/server.js)


---

### Task 2: System Load Simulation ⚙️

* **Load Simulation Script**:
    * **Script File**: `loadtest_socket_http.yml`
    * **View Script on GitHub**: [kapilbamotriya5232/Faff-assignment/blob/main/loadtest_socket_http.yml](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/loadtest_socket_http.yml)


---

### Task 3: Data Management & Advanced Search API 🔍

* **Data Generation Scripts** (Modified from original versions):
    * **Populating Real Tasks**: `scripts/populate_real_tasks.ts`
        * **View Script on GitHub**: [kapilbamotriya5232/Faff-assignment/.../populate_real_tasks.ts](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/scripts/populate_real_tasks.ts)
      
    * **Populating Real Messages**: `scripts/populate_real_messages.ts`
        * **View Script on GitHub**: [kapilbamotriya5232/Faff-assignment/.../populate_real_messages.ts](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/scripts/populate_real_messages.ts)
       
    * **Generative AI API**: `app/api/generative-ai/route.ts`
        * **View Code on GitHub**: [kapilbamotriya5232/Faff-assignment/.../generative-ai/route.ts](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/app/api/generative-ai/route.ts)
      
* **Search API Implementation**:
    * **Endpoint Logic**: `app/api/search-real-entities/route.ts`
    * **View Code on GitHub**: [kapilbamotriya5232/Faff-assignment/.../search-real-entities/route.ts](https://github.com/kapilbamotriya5232/Faff-assignment/blob/main/app/api/search-real-entities/route.ts)
   
* **How to Test the Search API**:
    * Access the following URL in your browser or an API client (like Postman or Insomnia):
        ```
        [http://35.200.216.141/api/search-real-entities/?q=](http://35.200.216.141/api/search-real-entities/?q=)<ENTER-QUERY>
        ```
    * Replace `<ENTER-QUERY>` with your desired search term (e.g., `q=project update` or `q=urgent bug fix`).
