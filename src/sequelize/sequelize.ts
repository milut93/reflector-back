import 'reflect-metadata'
import { buildSchemaSync } from 'type-graphql'
import {
  Sequelize,
  SequelizeOptions
} from 'sequelize-typescript'
import settings from '../../config/index'
import resolvers from './graphql/resolvers'
import path from 'path'

let sequelize

export const initSequelize = async (env?: string, drop?: boolean) => {
  const config = env || 'local'
  const options = {
    ...settings.sequelizeSettings[config],
    ...{
      underscored: true,
      modelPaths: [path.join(__dirname, '/**/*.model.ts')],
      migrationsPaths: [path.join(__dirname, '/**/*.migration.ts')]
    }
  }
  sequelize = new Sequelize(options as SequelizeOptions)
  await sequelize.sync({ force: !!drop })
}
export const createSchemaGraphQL = () => buildSchemaSync({
  resolvers: resolvers as any
})

export {
  sequelize
}
