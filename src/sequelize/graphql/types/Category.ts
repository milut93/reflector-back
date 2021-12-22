import { Field, InputType, Int } from 'type-graphql'
import {GraphQLUpload} from "apollo-server-express";
import {UploadType} from "./User";

@InputType({ isAbstract: true })
export class CategoryType {
    @Field({ nullable: true })
    name: string

    @Field({ nullable: true })
    description: string
}

@InputType({ isAbstract: true })
export class ArticlesType {
    @Field({ nullable: true })
    header: string

    @Field({ nullable: true })
    content: string

    @Field(type => GraphQLUpload, { nullable: true })
    image: UploadType

    @Field(type => Int, { nullable: true })
    categoryId: number

}
