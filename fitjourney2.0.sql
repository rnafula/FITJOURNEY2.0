CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstname VARCHAR(50),
  lastname VARCHAR(50),
  username VARCHAR(50) UNIQUE,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255),
  role ENUM('user', 'nutritionist', 'fit_instructor', 'admin'),
  habit VARCHAR(100), -- only for 'user'//remove we will have a habits table
  client_charges DECIMAL(10,2), -- only for professionals
  license VARCHAR(255), -- only for professionals
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
