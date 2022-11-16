package models

import (
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"

	"fmt"
)

// Connect to the database
func DBConnect(dbURI string) (*sqlx.DB, error) {
	db, err := sqlx.Connect("postgres", dbURI)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %s", err)
	}

	return db, nil
}
