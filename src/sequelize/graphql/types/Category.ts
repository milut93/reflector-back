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
