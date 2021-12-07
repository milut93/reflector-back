import User from './User.model'
import { ValidationError as ClassValidationError } from 'class-validator'
import { ArgumentValidationError } from 'type-graphql'
import Sequelize, { FindOptions } from 'sequelize'
import { IContextApp } from '../graphql/resolvers/basic'

const throwArgumentValidationError = (property: string, data: any, constrains: { [type: string]: string }): ArgumentValidationError => {
  const error = new ClassValidationError()
  error.target = data
  error.value = data[property]
  error.property = property
  error.constraints = constrains
  throw new ArgumentValidationError([error])
}

export const setUserFilterToWhereSearch = (options: FindOptions, ctx: IContextApp) => {
  if (options.where) {
    options.where = {
      [Sequelize.Op.and]: [
        {
          ...options.where
        }
      ]
    }
  } else {
    options.where = { }
  }
  return options
}

export {
  throwArgumentValidationError,
  User
}
