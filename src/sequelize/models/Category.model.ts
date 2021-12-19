import 'reflect-metadata'
import { Arg, Ctx, Field, ID, Int, Mutation, ObjectType, Resolver, UseMiddleware } from 'type-graphql'
import { AutoIncrement, Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript'
import { setUserFilterToWhereSearch, throwArgumentValidationError } from './index'
import { createBaseResolver, IContextApp, TModelResponse, TModelResponseSelectAll } from '../graphql/resolvers/basic'
import { CategoryType } from '../graphql/types/Category'
import { checkJWT } from '../graphql/middlewares'

@ObjectType()
@Table({
  tableName: 'category'
})

export default class Category extends Model {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
      type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field()
    @Column({
      allowNull: false,
      type: DataType.STRING(128)
    })
    name: string

    @Field({ nullable: true })
    @Column({
      allowNull: true,
      type: DataType.STRING(256)
    })
    description: string

    @Field()
    @CreatedAt
    @Column({
      field: 'created_at'
    })
    createdAt: Date

    @Field()
    @UpdatedAt
    @Column({
      field: 'updated_at'
    })
    updatedAt: Date

    public static selectOne (id: number, ctx?: IContextApp): Promise<Category> {
      return Category.findOne({
        where: {
          id
        }
      }) as any
    }

    public static async deleteOne (id: number, ctx: IContextApp): TModelResponse<Category> {
      const transaction = await Category.sequelize.transaction()
      const options = { transaction }

      try {
        const instance = await Category.findOne({
          where: {
            id
          },
          ...options
        })

        if (!instance) {
          throwArgumentValidationError('id', {}, { message: 'Category not exists' })
        }

        await instance.destroy(options)
        await transaction.commit()
        return null
      } catch (e) {
        transaction.rollback()
        throw e
      }
    }

    public static async updateOne (id: number, data: CategoryType, ctx: IContextApp): TModelResponse<Category> {
      const transaction = await Category.sequelize.transaction()
      const options = { transaction }

      try {
        const instance = await Category.findOne({
          where: {
            id: id
          },
          ...options
        })

        if (!instance) {
          throwArgumentValidationError('id', data, { message: 'Category not exists' })
        }

        await instance.update(data, options)
        await transaction.commit()
        return Category.selectOne(id, ctx)
      } catch (e) {
        transaction.rollback()
        throw e
      }
    }

    public static async insertOne (data: CategoryType, ctx: IContextApp): Promise<Category> {
      const transaction = await Category.sequelize.transaction()
      const options = { transaction }

      try {
        const instance = await Category.create({
          ...data
        }, options)
        await transaction.commit()
        return Category.selectOne(instance.id, ctx)
      } catch (e) {
        transaction.rollback()
        throw e
      }
    }

    public static async selectAll (options: any, ctx: IContextApp): TModelResponseSelectAll<Category> {
      options = setUserFilterToWhereSearch(options, ctx)
      return Category.findAndCountAll(options)
    }
}

const BaseResolver = createBaseResolver(Category, {
  updateInputType: CategoryType,
  insertInputType: CategoryType
})

@Resolver()
export class CategoryResolver extends BaseResolver {
    @UseMiddleware(checkJWT)
    @Mutation(returns => Category, { name: 'deleteCategory' })
  async _deleteCategory (@Arg('id', type => Int) id: number,
        @Ctx() ctx: IContextApp) {
    return Category.deleteOne(id, ctx)
  }
}

