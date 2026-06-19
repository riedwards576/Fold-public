CREATE TABLE `student_comments` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `student_id` integer NOT NULL,
  `user_id` integer,
  `content` text NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
