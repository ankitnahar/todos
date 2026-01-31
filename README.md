# My Todos - Task Management Application

A feature-rich task management application built with Spring Boot that helps you organize, track, and manage your daily tasks efficiently.

## Features

### Task Management
- Create, view, edit, and delete tasks
- Quick add functionality for rapid task creation
- Task details including name, status, description, and dates
- Copy existing tasks for similar work items

### Organization
- Tag system for categorizing tasks
- Four status options: TODO, IN_PROGRESS, DONE, BLOCKED
- Date tracking for start and completion
- Hide tasks temporarily for the current day

### Filtering & Search
- Powerful filtering by tags, status, and date ranges
- Quick filters for today, current week, current month
- Full-text search within task names and descriptions
- Combined filtering for precise task lists

### UI Experience
- Clean, responsive Bootstrap-based interface
- Compact view option for focused work
- Color-coded statuses and tags for visual organization
- Keyboard shortcuts for improved productivity

### Data Export
- Export tasks to Excel spreadsheets
- Filter tasks before export to get exactly what you need
- Maintains all task data in exports including tags, dates, and statuses

## Getting Started

### Prerequisites
- Java 17 or higher
- Maven 3.6+ for build management

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/my-todos.git
   cd my-todos
   ```

2. Build the application
   ```
   mvn clean install
   ```

3. Run the application
   ```
   java -jar target/todoapp-0.0.1-SNAPSHOT.jar
   ```

4. Access the application
   Open your browser and navigate to `http://localhost:8080`

### Database

The application uses an H2 in-memory database by default. The database file is stored in the `data/` directory.

To access the H2 console:
1. Navigate to `http://localhost:8080/h2-console` while the application is running
2. JDBC URL: `jdbc:h2:file:./data/todo`
3. Username: `sa`
4. Password: (leave empty)

## Tech Stack

- **Backend**: Spring Boot 3.x, Java 17+
- **Frontend**: Thymeleaf, Bootstrap 5, jQuery
- **Database**: H2 Database
- **Build Tool**: Maven
- **Export Functionality**: Apache POI

## Project Structure

```
my-todos/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── example/
│   │   │           └── todoapp/
│   │   │               ├── controller/    # MVC controllers
│   │   │               ├── model/         # Entity classes
│   │   │               ├── repository/    # Data access layer
│   │   │               ├── service/       # Business logic
│   │   │               └── TodoApplication.java
│   │   ├── resources/
│   │   │   ├── templates/    # Thymeleaf templates
│   │   │   ├── static/       # CSS, JS, images
│   │   │   └── application.properties
│   └── test/                 # Unit and integration tests
├── data/                     # H2 database files
└── pom.xml                   # Maven configuration
```

## Usage Examples

### Creating a Task
1. Use the "Quick Add Task" form at the top of the main page, or
2. Click "Add Task" for a more detailed task creation form

### Filtering Tasks
1. Use the quick filter buttons for common date ranges
2. For advanced filtering, use the filters section with:
   - Tag selection
   - Status dropdown
   - Text search
   - Custom date range

### Managing Tags
1. Click "Manage Tags" to view all tags
2. Add new tags as needed
3. Assign tags to tasks from the task detail page

### Exporting Tasks
1. Filter tasks as needed
2. Click the export button at the top of the task list
3. Open the downloaded Excel file

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Spring Boot and the Spring community
- Bootstrap team for the excellent UI framework
- All contributors to the project
