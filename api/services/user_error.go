package services

import "fmt"

// UserError indicates the technical reason an error occurred and also provides a user friendly explanation for the error.
type UserError interface {
	// UserError returns a user facing error string.
	UserError() string

	// InternalError returns a technical explanation of the error which users should not see.
	InternalError() string
}

// userErrorData stores UserData values.
type userErrorData struct {
	// userError is the string returned by UserError().
	userError string

	// internalError is the string returned by InternalError().
	internalError string
}

func (e userErrorData) UserError() string {
	return e.userError
}

func (e userErrorData) InternalError() string {
	return e.internalError
}

// userErrorFactory implements UserError and provides factory methods for setting user and internal error values.
type userErrorFactory struct {
	// userError is the string returned by UserError().
	userError string

	// internalError is the string returned by InternalError().
	internalError string
}

// NewUserError creates a userErrorFactory.
func NewUserError() *userErrorFactory {
	return &userErrorFactory{}
}

// UserError sets user error. Arguments same as fmt.Sprintf.
func (e *userErrorFactory) UserError(format string, a ...any) *userErrorFactory {
	e.userError = fmt.Sprintf(format, a)
	return e
}

// ErrUserError sets user error based on an error.
func (e *userErrorFactory) ErrUserError(err error) *userErrorFactory {
	e.userError = err.Error()
	return e
}

// InternalError sets internal error. Arguments same as fmt.Sprintf.
func (e *userErrorFactory) InternalError(format string, a ...any) *userErrorFactory {
	e.internalError = fmt.Sprintf(format, e)
	return e
}

// ErrInternalError sets internal error based on an error.
func (e *userErrorFactory) ErrInternalError(err error) *userErrorFactory {
	e.internalError = err.Error()
	return e
}

// Error returns a structure which implements UserError to return values defined by factory.
func (e *userErrorFactory) Error() userErrorData {
	return userErrorData{
		userError:     e.userError,
		internalError: e.internalError,
	}
}
