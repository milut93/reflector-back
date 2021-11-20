import {
    Field,
    InputType,
    Int
}                      from 'type-graphql'

@InputType({ isAbstract: true })
export class CategoryType {

    @Field({ nullable: true })
    name: string

    @Field({ nullable: true })
    description: string

}



@InputType({isAbstract: true})
export class ArticlesType {

    @Field({nullable: true})
    header: string

    @Field({nullable: true})
    content: string

    @Field(type => Int, {nullable: true})
    categoryId: number

    @Field(type => Int, {nullable: true})
    userId: number
}