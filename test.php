
<?php

$username = 'admin';
$password = 'password';

try {
    $dsn = "mysql:host=csci-467.czudh81hwn5y.us-east-2.rds.amazonaws.com;dbname=csci-467";
    $pdo = new PDO($dsn, $username, $password);

    $pdo->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);

    $employee = $pdo->query("SELECT * FROM sales_assoc;");
    $rows = $employee->fetchAll(PDO::FETCH_ASSOC);

    foreach($rows as $row) {

        echo "<td>" . $row["first_name"] . " " . $row["last_name"];
    }
}

catch(PDOexception $e) {
    echo "Connection to database failed: " . $e->getMessage();
}
?>